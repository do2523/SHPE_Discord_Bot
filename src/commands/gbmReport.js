import { MessageFlagsBitField, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("gbm-report")
  .setDescription("View GBM attendance progress");

export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, discord_username");

  if (membersError) {
    throw membersError;
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance")
    .select(
      `
        member_id,
        events!inner (
          event_type
        )
      `,
    )
    .eq("events.event_type", "GBM");

  if (attendanceError) {
    throw attendanceError;
  }

  const counts = new Map();

  for (const record of attendance) {
    counts.set(record.member_id, (counts.get(record.member_id) ?? 0) + 1);
  }

  const sortedMembers = members
    .map((member) => ({
      ...member,
      count: counts.get(member.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const lines = sortedMembers.map((member) => {
    const completed = member.count >= 1 ? "✅" : "❌";
    return `${completed} **${member.discord_username}** — ${member.count}/1`;
  });

  const reportChunks = [];
  let currentChunk = "## GBM Report\n\n";

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > 2000) {
      reportChunks.push(currentChunk.trimEnd());
      currentChunk = `${line}\n`;
    } else {
      currentChunk += `${line}\n`;
    }
  }

  reportChunks.push(currentChunk.trimEnd());

  await interaction.reply({
    content: reportChunks[0],
    flags: MessageFlagsBitField.Flags.Ephemeral,
  });

  for (const chunk of reportChunks.slice(1)) {
    await interaction.followUp({
      content: chunk,
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }
}
