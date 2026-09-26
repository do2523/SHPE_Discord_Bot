import { MessageFlagsBitField, SlashCommandBuilder } from "discord.js";

import { supabase } from "../services/supabase.js";
import { isEboard } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("update-history")
  .setDescription("Add a member to an event's attendance")
  .addIntegerOption((option) =>
    option
      .setName("event-id")
      .setDescription("ID of the event")
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("member-id")
      .setDescription("ID of the member")
      .setRequired(true),
  );

export async function execute(interaction) {
  if (!isEboard(interaction)) {
    return interaction.reply({
      content: "Only E-board members can use this command.",
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const eventId = interaction.options.getInteger("event-id", true);
  const memberId = interaction.options.getInteger("member-id", true);

  const [
    { data: event, error: eventError },
    { data: member, error: memberError },
  ] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).maybeSingle(),
    supabase
      .from("members")
      .select("id, discord_username")
      .eq("id", memberId)
      .maybeSingle(),
  ]);

  if (eventError) {
    throw eventError;
  }

  if (memberError) {
    throw memberError;
  }

  if (!event) {
    return interaction.reply({
      content: `Event ${eventId} was not found.`,
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  if (!member) {
    return interaction.reply({
      content: `Member ${memberId} was not found.`,
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });
  }

  const { error: attendanceError } = await supabase.from("attendance").insert({
    event_id: eventId,
    member_id: memberId,
  });

  if (attendanceError) {
    if (attendanceError.code === "23505") {
      return interaction.reply({
        content: `${member.discord_username} is already marked as attending ${event.name}.`,
        flags: MessageFlagsBitField.Flags.Ephemeral,
      });
    }

    throw attendanceError;
  }

  await interaction.reply({
    content: `Added ${member.discord_username} to ${event.name}.`,
    flags: MessageFlagsBitField.Flags.Ephemeral,
  });
}
