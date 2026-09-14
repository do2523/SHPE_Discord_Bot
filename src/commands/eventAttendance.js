import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

// Build the /event-attendance slash command.
export const data = new SlashCommandBuilder()
  .setName("event-attendance")
  .setDescription("View attendance for an event")

  // Require the E-board member to enter the event's attendance code.
  .addStringOption((option) =>
    option
      .setName("code")
      .setDescription("Event attendance code")
      .setRequired(true),
  );

// Runs whenever someone uses /event-attendance.
export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const code = interaction.options.getString("code");

  // Search for the event that uses this attendance code.
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("attendance_code", code)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    return interaction.reply({
      content: "Event not found.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Get all attendance records for this specific event.
  const { data: attendance, error } = await supabase
    .from("attendance")
    .select(
      `
                checked_in_at,
                members (
                    discord_username
                )
            `,
    )
    // Only get attendance records connected to this event.
    .eq("event_id", event.id);

  if (error) {
    throw error;
  }

  // nobody has checked into the event yet.
  if (!attendance.length) {
    return interaction.reply({
      content: `Nobody has checked into **${event.name}** yet.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const names = attendance.map(
    (record, index) => `${index + 1}. ${record.members.discord_username}`,
  );
  await interaction.reply({
    content:
      `## ${event.name}\n` +
      `**Attendance: ${attendance.length}**\n\n` +
      names.join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}
