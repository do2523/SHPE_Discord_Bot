import "dotenv/config";

import { supabase } from "./services/supabase.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const { data: members, error } = await supabase
  .from("members")
  .select("id, discord_username");

if (error) {
  console.error("Could not fetch members from Supabase:", error);
  process.exit(1);
}

const { data: attendance, error: attendanceError } = await supabase.from(
  "attendance",
).select(`
    member_id,
    events (points)
  `);

if (attendanceError) {
  console.error("Could not fetch attendance from Supabase:", attendanceError);
  process.exit(1);
}

const pointsByMember = new Map(members.map((member) => [member.id, 0]));

for (const record of attendance) {
  const points = record.events?.points ?? 0;
  pointsByMember.set(
    record.member_id,
    (pointsByMember.get(record.member_id) ?? 0) + points,
  );
}

members
  .map((member) => ({
    username: member.discord_username,
    points: pointsByMember.get(member.id) ?? 0,
  }))
  .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
  .forEach((member) =>
    console.log(`${member.username} — ${member.points} pts`),
  );
