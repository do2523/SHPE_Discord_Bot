import { MessageFlagsBitField, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("View all events attended by a member")
  .addStringOption((option) =>
    option
      .setName("member")
      .setDescription("Discord username to look up")
      .setRequired(true),
  );

export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const username = interaction.options.getString("member", true).trim();

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, discord_username")
    .ilike("discord_username", username)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (!member) {
    return interaction.reply({
      content: `No member found with the username ${username}.`,
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const { data: attendance, error } = await supabase
    .from("attendance")
    .select(
      `
				checked_in_at,
				events (
					name,
					start_time,
					points
				)
			`,
    )
    .eq("member_id", member.id)
    .order("checked_in_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!attendance.length) {
    return interaction.reply({
      content: `${member.discord_username} has not attended any SHPE events yet.`,
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const lines = attendance.map((record) => {
    const event = record.events;
    const date = new Date(event.start_time).toLocaleDateString();

    return `• **${event.name}** — ${date} — ${event.points} pts`;
  });

  await interaction.reply({
    content: `## Event History: ${member.discord_username}\n\n${lines.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}
