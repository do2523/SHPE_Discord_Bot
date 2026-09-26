import "dotenv/config";

import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

import * as attendance from "./commands/attendance.js";
import * as points from "./commands/points.js";
import * as leaderboard from "./commands/leaderboard.js";
import * as events from "./commands/events.js";
import * as createEvent from "./commands/createEvent.js";
import * as eventAttendance from "./commands/eventAttendance.js";
import * as corporateStatus from "./commands/corporateStatus.js";
import * as corporateReport from "./commands/corporateReport.js";
import * as codes from "./commands/codes.js";
import * as history from "./commands/History.js";

// Put all command modules into one array.
const commandModules = [
  attendance,
  points,
  leaderboard,
  events,
  createEvent,
  eventAttendance,
  corporateStatus,
  corporateReport,
  codes,
  history,
];

const commands = new Map(
  commandModules.map((command) => [command.data.name, command]),
);

// Create the Discord bot client.
// GatewayIntentBits.Guilds tells Discord that the bot
// needs basic server/guild information and interactions.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// client.once() listens for an event once and then stops listening.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

// Listen every time Discord sends an interaction.
client.on(Events.InteractionCreate, async (interaction) => {
  // Ignore interactions that are not slash commands.
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const message = {
      content: "Something went wrong while running this command.",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message);
    } else {
      await interaction.reply(message);
    }
  }
});

// Once login succeeds, the ClientReady event above will fire.
client.login(process.env.DISCORD_TOKEN);
