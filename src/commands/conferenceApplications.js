import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";

// Build the /conference-applications slash command.
export const data = new SlashCommandBuilder()
  .setName("conference-applications")
  .setDescription("View companies and application links for the conference");

const responseFlags = MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds;

// Runs whenever someone uses /conference-applications.
export async function execute(interaction) {
  const { data: applications, error } = await supabase
    .from("applications")
    .select("company, application_link");

  if (error) {
    throw error;
  }

  if (!applications.length) {
    return interaction.reply({
      content: "There are currently no conference applications.",
      flags: responseFlags,
    });
  }

  const lines = applications.map(
    (application) =>
      `**${application.company}**\n[Application link](${application.application_link})`,
  );

  const chunks = [];
  let currentChunk = "# Conference Applications\n\n";

  for (const line of lines) {
    if (currentChunk.length + line.length + 2 > 2000) {
      chunks.push(currentChunk.trimEnd());
      currentChunk = `${line}\n\n`;
    } else {
      currentChunk += `${line}\n\n`;
    }
  }

  chunks.push(currentChunk.trimEnd());

  await interaction.reply({
    content: chunks[0],
    flags: responseFlags,
  });

  for (const chunk of chunks.slice(1)) {
    await interaction.followUp({
      content: chunk,
      flags: responseFlags,
    });
  }
}
