import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

// Build the /corporate-report slash command.
export const data = new SlashCommandBuilder()
  .setName("corporate-report")
  .setDescription("View Corporate attendance progress");

// Runs whenever someone uses /corporate-report.
export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Get every member from the members table in case theirs members with 0 corporate events
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("*");

  if (membersError) {
    throw membersError;
  }

  // Get attendance records only for the Corporate cabinet.
  const { data: attendance, error } = await supabase
    .from("attendance")
    .select(
      ` 
                member_id, 
                events!inner ( 
                  cabinet 
                ) 
            `,
    )
    .eq("events.cabinet", "Corporate");

  if (error) {
    throw error;
  }

  const counts = new Map();

  // Go through every Corporate attendance record.
  for (const record of attendance) {
    counts.set(record.member_id, (counts.get(record.member_id) ?? 0) + 1);
  }

  const sortedMembers = members
    .map((member) => ({
      // ...member copies all properties from the original member.
      ...member,
      count: counts.get(member.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Turn every member into a formatted line of text.
  const lines = sortedMembers.map((member) => {
    const completed = member.count >= 3 ? "✅" : "❌";
    return (
      `${completed} **${member.discord_username}** ` + `— ${member.count}/3`
    );
  });

  // Discord limits each message to 2,000 characters soo we split large reports.
  const reportChunks = [];
  let currentChunk = "## Corporate Report\n\n";

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
    flags: MessageFlags.Ephemeral,
  });

  for (const chunk of reportChunks.slice(1)) {
    await interaction.followUp({
      content: chunk,
      flags: MessageFlags.Ephemeral,
    });
  }
}
