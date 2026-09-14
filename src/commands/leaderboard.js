import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";

// Build the /leaderboard slash command.
export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the SHPE points leaderboard");

// Runs whenever someone uses /leaderboard.
export async function execute(interaction) {
  // Get all attendance records, member's Discord username, and the number of points for the event they attended.
  const { data: records, error } = await supabase.from("attendance").select(`
            member_id,
            members (
                discord_username
            ),
            events (
                points
            )
        `);

  if (error) {
    throw error;
  }

  const scores = new Map();

  // Go through every attendance record one at a time.
  for (const record of records) {
    const id = record.member_id;

    // If this member is not already in the Map then add them with a starting point total of 0.
    if (!scores.has(id)) {
      scores.set(id, {
        username: record.members?.discord_username ?? "Unknown Member",

        points: 0,
      });
    }

    // Get this member from the Map and add the points from the event they attended.
    scores.get(id).points += record.events?.points ?? 0;
  }

  // Get all member score objects from the Map and convert them into a normal array.
  const leaderboard = [...scores.values()]

    // Sort members from highest points to lowest points.
    .sort((a, b) => b.points - a.points)

    // Keep only the first 10 members.
    .slice(0, 10);

  if (leaderboard.length === 0) {
    return interaction.reply({
      content: "Nobody has earned SHPE points yet.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Convert every leaderboard member into a formatted line of text.
  const lines = leaderboard.map(
    (member, index) =>
      `**${index + 1}. ${member.username}** — ${member.points} pts`,
  );

  await interaction.reply({
    content: `## SHPE Leaderboard\n${lines.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}
