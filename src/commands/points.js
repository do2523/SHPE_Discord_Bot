import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { getOrCreateMember } from "../utils/members.js";

// Build the /points slash command.
export const data = new SlashCommandBuilder()
  .setName("points")
  .setDescription("View your SHPE points");

// Runs whenever a user uses the /points command.
export async function execute(interaction) {
  // Find the Discord user in the members table.
  const member = await getOrCreateMember(interaction.user);

  // Get all attendance records for this member and the related event's points and cabinet.
  const { data: records, error } = await supabase
    .from("attendance")
    .select(
      `
            id,
            events (
                points,
                cabinet
            )
        `,
    )
    // Basically "WHERE member_id = members.id"
    .eq("member_id", member.id);

  if (error) {
    throw error;
  }

  // Add together the points from every event the member attended.
  const totalPoints = records.reduce(
    (total, record) => total + (record.events?.points ?? 0),
    0,
  );

  // Keep only attendance records where the event belongs to the Corporate cabinet.
  const corporateEvents = records.filter(
    (record) => record.events?.cabinet?.toLowerCase() === "corporate",
  ).length;

  // Send the user's stats back privately.
  await interaction.reply({
    content:
      `## Your SHPE Stats\n` +
      `**Points:** ${totalPoints}\n` +
      `**Events attended:** ${records.length}\n` +
      `**Corporate Cabinet events:** ${corporateEvents}`,
    flags: MessageFlags.Ephemeral,
  });
}
