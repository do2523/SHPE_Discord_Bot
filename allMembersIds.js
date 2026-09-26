import "dotenv/config";

import { supabase } from "./src/services/supabase.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const { data: members, error } = await supabase
  .from("members")
  .select("id, discord_username")
  .order("id", { ascending: true });

if (error) {
  console.error("Could not fetch members from Supabase:", error);
  process.exit(1);
}

for (const member of members) {
  console.log(`Member ID: ${member.id} | Username: ${member.discord_username}`);
}
