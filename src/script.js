import "dotenv/config";
import fs from "node:fs";
import { parse } from "csv-parse/sync";

import { supabase } from "./services/supabase.js";
import { generateAttendanceCode } from "./utils/attendanceCode.js";

const EVENT = {
  name: "Corporate Committee Meeting 2",
  cabinet: "Corporate",
  points: 2,
  location: "Classroom",

  start_time: "2026-09-15T11:00:00-04:00",
  end_time: "2026-09-15T15:30:00-04:00",
};

const CSV_PATH = "./event.csv";

const DISCORD_COLUMN = "discord_username";

async function main() {
  // Read the CSV file
  const file = fs.readFileSync(CSV_PATH);

  const rows = parse(file, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${rows.length} attendance rows.`);

  // Check if event exists
  const { data: existingEvent, error: existingEventError } = await supabase
    .from("events")
    .select("*")
    .eq("name", EVENT.name)
    .eq("start_time", EVENT.start_time)
    .maybeSingle();

  if (existingEventError) {
    throw existingEventError;
  }

  if (existingEvent) {
    throw new Error(
      `Event "${EVENT.name}" already exists with ID ${existingEvent.id}`,
    );
  }

  // Generate a code even though this is a historical event.
  const attendanceCode = await generateAttendanceCode();

  const endTime = new Date(EVENT.end_time);

  const codeExpiresAt = new Date(
    endTime.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  // Create the event in Supabase
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      name: EVENT.name,
      cabinet: EVENT.cabinet,
      points: EVENT.points,
      location: EVENT.location,

      start_time: EVENT.start_time,
      end_time: EVENT.end_time,

      attendance_code: attendanceCode,
      code_expires_at: codeExpiresAt,

      created_by_discord_id: "HISTORICAL_IMPORT",
    })
    .select()
    .single();

  if (eventError) {
    throw eventError;
  }

  console.log(`Created event: ${event.name}`);
  console.log(`Event ID: ${event.id}`);

  let imported = 0;
  const unmatched = [];

  // Go through everyone on the sheet
  for (const row of rows) {
    const username = row[DISCORD_COLUMN]?.trim().replace(/^@/, "");

    if (!username) {
      continue;
    }

    // Find the member in Supabase.
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .ilike("discord_username", username)
      .maybeSingle();

    if (memberError) {
      console.error(`Error looking up ${username}:`, memberError);

      continue;
    }

    // Keep track of people who could not be matched
    if (!member) {
      unmatched.push(username);

      console.log(`❌ Not found: ${username}`);

      continue;
    }

    // Add the historical attendance record.
    const { error: attendanceError } = await supabase
      .from("attendance")
      .insert({
        member_id: member.id,
        event_id: event.id,
      });

    if (attendanceError) {
      // 23505 means the member/event pair already existss
      if (attendanceError.code === "23505") {
        console.log(`Skipped duplicate: ${username}`);
        continue;
      }

      console.error(
        `Error adding attendance for ${username}:`,
        attendanceError,
      );

      continue;
    }

    imported++;

    console.log(`✅ Added ${username}`);
  }

  console.log("\nImport finished.");
  console.log(`Imported: ${imported}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log("\nUnmatched usernames:");

    for (const username of unmatched) {
      console.log(`- ${username}`);
    }
  }
}

main().catch((error) => {
  console.error("Import failed:");
  console.error(error);

  process.exit(1);
});
