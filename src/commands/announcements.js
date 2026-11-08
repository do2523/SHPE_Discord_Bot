import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { DateTime } from "luxon";

import { isEboard } from "../utils/permissions.js";

const TIME_ZONE = "America/New_York";

// Build the /announcements slash command.
export const data = new SlashCommandBuilder()
  .setName("announcements")
  .setDescription("E-board only: list this week's calendar events (Mon-Sun)");

// Gets the next upcoming Monday 00:00 through the following Monday 00:00 (Mon-Sun).
// If today is Monday, today counts as the start of the week.
function getWeekRange() {
  const today = DateTime.now().setZone(TIME_ZONE).startOf("day");
  const daysUntilMonday = (8 - today.weekday) % 7; // Luxon: Monday = 1
  const monday = today.plus({ days: daysUntilMonday });

  return { monday, nextMonday: monday.plus({ days: 7 }) };
}

// Pulls events from the Google Calendar API.
async function fetchCalendarEvents(start, end) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!calendarId || !apiKey) {
    throw new Error("GOOGLE_CALENDAR_ID or GOOGLE_API_KEY is not set.");
  }

  const params = new URLSearchParams({
    key: apiKey,
    timeMin: start.toUTC().toISO(),
    timeMax: end.toUTC().toISO(),
    singleEvents: "true", // expands recurring events
    orderBy: "startTime",
    timeZone: TIME_ZONE,
    maxResults: "250",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
  );

  if (!response.ok) {
    throw new Error(
      `Google Calendar request failed (${response.status}): ${await response.text()}`,
    );
  }

  const body = await response.json();
  return body.items ?? [];
}

// Formats an event's time, handling all-day events.
function formatTime(event) {
  if (event.start.date) {
    return "All day";
  }

  const start = DateTime.fromISO(event.start.dateTime).setZone(TIME_ZONE);
  const end = DateTime.fromISO(event.end.dateTime).setZone(TIME_ZONE);

  return `${start.toFormat("h:mm a")} - ${end.toFormat("h:mm a")}`;
}

// Runs whenever someone uses /announcements.
export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { monday, nextMonday } = getWeekRange();
  const events = (await fetchCalendarEvents(monday, nextMonday)).filter(
    (event) => event.status !== "cancelled",
  );

  const header = `# 📅 Events: ${monday.toFormat("LLL d")} - ${monday
    .plus({ days: 6 })
    .toFormat("LLL d")}\n\n`;

  if (!events.length) {
    return interaction.editReply(`${header}No events on the calendar.`);
  }

  // Group events by day (Monday - Sunday).
  const days = new Map();

  for (const event of events) {
    const startISO = event.start.dateTime ?? event.start.date;
    const day = DateTime.fromISO(startISO, { zone: TIME_ZONE }).toFormat(
      "cccc, LLLL d",
    );

    if (!days.has(day)) {
      days.set(day, []);
    }

    days.get(day).push(`• **${event.summary ?? "Untitled"}**: ${formatTime(event)}`);
  }

  const sections = [...days].map(
    ([day, lines]) => `### ${day}\n${lines.join("\n")}`,
  );

  // Split into messages under Discord's 2000 character limit.
  const chunks = [];
  let current = header;

  for (const section of sections) {
    if (current.length + section.length + 2 > 2000) {
      chunks.push(current.trimEnd());
      current = "";
    }
    current += `${section}\n\n`;
  }

  chunks.push(current.trimEnd());

  await interaction.editReply(chunks[0]);

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp({
      content: chunk,
      flags: MessageFlags.Ephemeral,
    });
  }
}
