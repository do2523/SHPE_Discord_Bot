import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { DateTime } from "luxon";
import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

const TIME_ZONE = "America/New_York";

// Build the /codes slash command.
export const data = new SlashCommandBuilder()
  .setName("codes")
  .setDescription("View attendance codes for the five most recent events");

// Runs whenever someone uses /codes.
export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("name, start_time, attendance_code")
    .lt("end_time", new Date().toISOString())
    .order("start_time", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  if (!events.length) {
    return interaction.reply({
      content: "There are no past SHPE events yet.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = events.map((event) => {
    const date = DateTime.fromISO(event.start_time).setZone(TIME_ZONE);

    return `**${event.name}**\n📅 ${date.toFormat("MMMM d, yyyy")}\n🔑 \`${event.attendance_code}\``;
  });

  await interaction.reply({
    content: `# Recent Attendance Codes\n\n${lines.join("\n\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}
