import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { DateTime } from "luxon";
import { supabase } from "../services/supabase.js";

// Build the /events slash command.
export const data = new SlashCommandBuilder()
  .setName("events")
  .setDescription("View upcoming SHPE events");

// Runs whenever someone uses /events.
export async function execute(interaction) {
  // Get upcoming events from the events table.
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .gte("end_time", new Date().toISOString())

    .order("start_time", {
      ascending: true,
    })

    // Only return the next 10 upcoming events.
    .limit(10);

  if (error) {
    throw error;
  }

  // If the query returned no events, tell the user.
  if (!events.length) {
    return interaction.reply({
      content: "There are currently no upcoming SHPE events.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Convert every event object into formatted text that can be displayed in Discord.
  const lines = events.map((event) => {
    // Read the event's stored UTC start time and convert it back into Eastern Time for display.
    const start = DateTime.fromISO(event.start_time).setZone(
      "America/New_York",
    );

    return (
      `### ${event.name}\n` +
      `**${event.cabinet} Cabinet**\n` +
      `📅 ${start.toFormat("cccc, LLLL d")}\n` +
      `⏰ ${start.toFormat("h:mm a")}\n` +
      `📍 ${event.location}\n` +
      `⭐ ${event.points} points`
    );
  });

  await interaction.reply({
    content: `# Upcoming SHPE Events\n\n` + `${lines.join("\n\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}
