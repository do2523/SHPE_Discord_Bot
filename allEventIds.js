import "dotenv/config";

import { supabase } from "./src/services/supabase.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const { data: events, error } = await supabase
  .from("events")
  .select("id, name, attendance_code")
  .order("id", { ascending: true });

if (error) {
  console.error("Could not fetch events from Supabase:", error);
  process.exit(1);
}

for (const event of events) {
  console.log(
    `Event ID: ${event.id} | Event Name: ${event.name} | Attendance Code: ${event.attendance_code}`,
  );
}
