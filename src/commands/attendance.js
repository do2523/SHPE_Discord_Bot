import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { getOrCreateMember } from "../utils/members.js";

// Build the /attendance slash command.
export const data = new SlashCommandBuilder()
  .setName("attendance")
  .setDescription("Check into a SHPE event")
  .addStringOption((option) =>
    option
      .setName("code")
      .setDescription("The 5-digit event attendance code")
      .setRequired(true)

      .setMinLength(5)
      .setMaxLength(5),
  );

// Runs whenever someone uses the /attendance command.
export async function execute(interaction) {
  const code = interaction.options.getString("code").trim();
  if (!/^\d{5}$/.test(code)) {
    return interaction.reply({
      content: "The attendance code must contain exactly 5 digits.",

      // Ephemeral means only the user who ran the command can see the reply.
      flags: MessageFlags.Ephemeral,
    });
  }

  // Search the events table for an event with this attendance code.
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("attendance_code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // If no event was found, the attendance code does not exist.
  if (!event) {
    return interaction.reply({
      content: "That attendance code is invalid.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Check whether the attendance code has expired.
  // Both values are converted into JavaScript Date objects so they can be compared.
  if (new Date() > new Date(event.code_expires_at)) {
    return interaction.reply({
      content: "That attendance code has expired.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Find or create Discord user in the members table.
  const member = await getOrCreateMember(interaction.user);

  // Create an attendance record connecting the member to the event.
  const { error: attendanceError } = await supabase.from("attendance").insert({
    member_id: member.id,
    event_id: event.id,
  });

  // Check if creating the attendance record failed.
  if (attendanceError) {
    // PostgreSQL error code 23505 means a unique constraint was violated.
    if (attendanceError.code === "23505") {
      return interaction.reply({
        content: `You already checked into **${event.name}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    throw attendanceError;
  }

  // Attendance was recorded successfully.
  return interaction.reply({
    content:
      `Attendance recorded for **${event.name}**.\n` +
      `You earned **${event.points} point${event.points === 1 ? "" : "s"}**.`,

    flags: MessageFlags.Ephemeral,
  });
}
