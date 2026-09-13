import crypto from "node:crypto";
import { supabase } from "../services/supabase.js";

export async function generateAttendanceCode() {
  // Try up to 20 times to generate a unique attendance code
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = crypto.randomInt(0, 100000).toString().padStart(5, "0");

    // Check the events table to see if this attendance code has been used
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("attendance_code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If data is null, that means no event currently has this code.
    if (!data) {
      return code;
    }
  }

  throw new Error("Could not generate a unique attendance code.");
}
