import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { DateTime } from "luxon";

import { supabase } from "../services/supabase.js";
import { generateAttendanceCode } from "../utils/attendanceCode.js";
import { isEboard } from "../utils/permissions.js";

const TIME_ZONE = "America/New_York";

// Build the /create-event slash command.
export const data = new SlashCommandBuilder()
  .setName("create-event")
  .setDescription("Create a new SHPE event")
  .addStringOption((option) =>
    option.setName("name").setDescription("Event name").setRequired(true),
  )

  // Required SHPE cabinet.
  .addStringOption((option) =>
    option
      .setName("cabinet")
      .setDescription("SHPE cabinet")
      .setRequired(true)
      .addChoices(
        { name: "Corporate", value: "Corporate" },
        { name: "Technology", value: "Technology" },
        {
          name: "Professional Development",
          value: "Professional Development",
        },
        {
          name: "Community Outreach",
          value: "Community Outreach",
        },
        { name: "Internal", value: "Internal" },
      ),
  )

  // Required event date.
  // Expected format: 2026-09-13
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription("Event date: YYYY-MM-DD")
      .setRequired(true),
  )

  // Required start time using 24-hour time.
  // Example: 18:30 = 6:30 PM.
  .addStringOption((option) =>
    option
      .setName("start")
      .setDescription("Start time in 24-hour format: HH:MM")
      .setRequired(true),
  )

  // Required end time using 24-hour time.
  .addStringOption((option) =>
    option
      .setName("end")
      .setDescription("End time in 24-hour format: HH:MM")
      .setRequired(true),
  )

  // Required event location.
  .addStringOption((option) =>
    option
      .setName("location")
      .setDescription("Event location")
      .setRequired(true),
  )

  // Required number of SHPE points.
  .addIntegerOption((option) =>
    option
      .setName("points")
      .setDescription("How many points the event is worth")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(6),
  )

  // Optional event type.
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Event type")
      .setRequired(false)
      .addChoices(
        { name: "GBM", value: "GBM" },
        { name: "Workshop", value: "Workshop" },
        { name: "Corporate", value: "Corporate" },
        { name: "Social", value: "Social" },
        { name: "Volunteer", value: "Volunteer" },
        { name: "Conference", value: "Conference" },
        { name: "Other", value: "Other" },
      ),
  )

  // Optional event description.
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("Event description")
      .setRequired(false),
  );

// Runs whenever someone uses /create-event.
export async function execute(interaction) {
  // If they are not E-board, stop the command immediately.
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can create events.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Get all required values entered in the slash command.
  const name = interaction.options.getString("name");
  const cabinet = interaction.options.getString("cabinet");
  const date = interaction.options.getString("date");
  const start = interaction.options.getString("start");
  const end = interaction.options.getString("end");
  const location = interaction.options.getString("location");
  const points = interaction.options.getInteger("points");

  // These options are optional.
  const eventType = interaction.options.getString("type") ?? null;

  const description = interaction.options.getString("description") ?? null;

  // Combine the date and start time into one Luxon DateTime object.
  const startTime = DateTime.fromFormat(
    `${date} ${start}`,
    "yyyy-MM-dd HH:mm",
    { zone: TIME_ZONE },
  );

  // Do the same thing for the event end time.
  let endTime = DateTime.fromFormat(`${date} ${end}`, "yyyy-MM-dd HH:mm", {
    zone: TIME_ZONE,
  });

  // Make sure both the date and times were valid.
  if (!startTime.isValid || !endTime.isValid) {
    return interaction.reply({
      content:
        "Invalid date/time. Use `YYYY-MM-DD` for the date " +
        "and `HH:MM` using 24-hour time.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Make sure the event does not end before or at the same time that it starts.
  if (endTime <= startTime) {
    return interaction.reply({
      content: "The event end time must be after its start time.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Generate a unique 5-digit attendance code.
  const attendanceCode = await generateAttendanceCode();

  // The attendance code expires 2 hours after the event ends.
  const expiration = endTime.plus({ hours: 2 });

  // Insert the new event into the events table.
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name,
      cabinet,
      // Database column names are different from our JavaScript variable names here.
      event_type: eventType,
      description,
      location,
      points,
      // Convert Eastern Time into UTC before storing it.
      // This makes time storage consistent in the database.
      start_time: startTime.toUTC().toISO(),
      end_time: endTime.toUTC().toISO(),
      attendance_code: attendanceCode,
      code_expires_at: expiration.toUTC().toISO(),
      // Store the Discord ID of the E-board member who created the event.
      created_by_discord_id: interaction.user.id,
    })

    // Return the newly created event row.
    .select()
    .single();

  if (error) {
    throw error;
  }

  await interaction.reply({
    content:
      `## Event Created\n` +
      `**${event.name}**\n\n` +
      `**Cabinet:** ${event.cabinet}\n` +
      `**Date:** ${startTime.toFormat("MMMM d, yyyy")}\n` +
      `**Time:** ${startTime.toFormat("h:mm a")} – ${endTime.toFormat("h:mm a")}\n` +
      `**Location:** ${event.location}\n` +
      `**Points:** ${event.points}\n\n` +
      `### Attendance Code: \`${attendanceCode}\`\n` +
      `Code expires at **${expiration.toFormat("h:mm a")}**.`,
    flags: MessageFlags.Ephemeral,
  });
}
