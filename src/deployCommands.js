import "dotenv/config";

import { REST, Routes } from "discord.js";

import { data as attendance } from "./commands/attendance.js";
import { data as points } from "./commands/points.js";
import { data as leaderboard } from "./commands/leaderboard.js";
import { data as events } from "./commands/events.js";
import { data as createEvent } from "./commands/createEvent.js";
import { data as eventAttendance } from "./commands/eventAttendance.js";
import { data as corporateStatus } from "./commands/corporateStatus.js";
import { data as corporateReport } from "./commands/corporateReport.js";
import { data as codes } from "./commands/codes.js";

// command.toJSON() converts each SlashCommandBuilder object into a plain JSON object that Discord's API can understand.
const commands = [
  attendance,
  points,
  leaderboard,
  events,
  createEvent,
  eventAttendance,
  corporateStatus,
  corporateReport,
  codes,
].map((command) => command.toJSON());

// Create a REST client that will communicate with Discord's API.
// setToken() gives the REST client our bot token
// so Discord knows which bot is making the request.
const rest = new REST({
  version: "10",
}).setToken(process.env.DISCORD_TOKEN);

try {
  console.log("Registering Discord slash commands...");
  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: commands,
  });

  console.log("Slash commands registered.");
} catch (error) {
  console.error(error);
}
