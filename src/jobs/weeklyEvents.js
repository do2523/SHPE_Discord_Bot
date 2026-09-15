import cron from "node-cron";
import { DateTime } from "luxon";
import { supabase } from "../services/supabase.js";

const TIME_ZONE = "America/New_York";

// Starts the automatic weekly event announcement job.
export function startWeeklyEventJob(client) {
  // Schedule a function to run automatically.
  cron.schedule(
    "0 12 * * 0",
    // This function runs every time the cron schedule is triggered.
    async () => {
      try {
        const now = DateTime.now().setZone(TIME_ZONE);

        const end = now.plus({ days: 7 });

        const { data: events, error } = await supabase
          .from("events")
          .select("*")
          .gte("start_time", now.toUTC().toISO())
          .lt("start_time", end.toUTC().toISO())
          .order("start_time", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        if (!events.length) {
          return;
        }

        const channel = await client.channels.fetch(
          process.env.ANNOUNCEMENT_CHANNEL_ID,
        );

        if (!channel?.isTextBased()) {
          throw new Error("Announcement channel is invalid.");
        }

        // Convert every event into formatted Discord text.
        const eventText = events.map((event) => {
          const start = DateTime.fromISO(event.start_time).setZone(TIME_ZONE);

          return (
            `### ${event.name}\n` +
            `**${event.cabinet} Cabinet**\n` +
            `📅 ${start.toFormat("cccc, LLLL d")}\n` +
            `⏰ ${start.toFormat("h:mm a")}\n` +
            `📍 ${event.location}\n` +
            `⭐ ${event.points} points`
          );
        });

        // Send the weekly event announcement.
        await channel.send(
          `# 📅 SHPE Events This Week\n\n` + eventText.join("\n\n"),
        );
      } catch (error) {
        // Print an error if the weekly job fails.
        console.error("Weekly event announcement failed:", error);
      }
    },

    {
      timezone: TIME_ZONE,
    },
  );

  console.log("Weekly event announcement scheduled.");
}
