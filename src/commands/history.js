import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { getOrCreateMember } from "../utils/members.js";
import { isEboard } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("View all events a member has attended");

export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const member = await getOrCreateMember(interaction.user);

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
      content: "You have not attended any SHPE events yet.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = attendance.map((record) => {
    const event = record.events;
    const date = new Date(event.start_time).toLocaleDateString();

    return `• **${event.name}** — ${date} — ${event.points} pts`;
  });

  await interaction.reply({
    content: `## Your Event History\n\n${lines.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}
