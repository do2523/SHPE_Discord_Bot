import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

// Build the /corporate-status slash command.
export const data = new SlashCommandBuilder()
  .setName("corporate-status")
  .setDescription("Check a member's Corporate requirement")

  // Let the E-board member choose which Discord user to check.
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("Member to check")
      .setRequired(true),
  );

// Runs whenever someone uses /corporate-status.
export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const discordUser = interaction.options.getUser("member");

  // Find that Discord user in the members table.
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")

    .eq("discord_id", discordUser.id)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (!member) {
    return interaction.reply({
      content: `${discordUser.username} has not attended any SHPE events yet.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Get this member's attendance records, but only for Corporate events.
  // !inner removes attendance records whose related event does not match the filter.
  const { data: attendance, error } = await supabase
    .from("attendance")
    .select(
      `
                id,
                events!inner (
                    event_type
                )
            `,
    )

    .eq("member_id", member.id)
    .eq("events.event_type", "Corporate");

  if (error) {
    throw error;
  }

  const count = attendance.length;

  const completed = count >= 3;

  await interaction.reply({
    content:
      `## Corporate Status\n` +
      `**Member:** ${discordUser.username}\n` +
      `**Corporate events attended:** ${count}/3\n` +
      `**Status:** ${
        completed ? "Requirement completed" : `${3 - count} more required`
      }`,
    flags: MessageFlags.Ephemeral,
  });
}
