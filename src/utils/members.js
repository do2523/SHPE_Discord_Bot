import { supabase } from "../services/supabase.js";

export async function getOrCreateMember(user) {
  // Try to find an existing member using their Discord ID.
  const { data: existingMember, error: findError } = await supabase
    .from("members")
    .select("*")
    .eq("discord_id", user.id)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingMember) {
    // Check if their Discord username has changed.
    if (existingMember.discord_username !== user.username) {
      // Update the username in Supabase and return the updated row.
      const { data: updatedMember, error: updateError } = await supabase
        .from("members")
        .update({
          discord_username: user.username,
        })
        .eq("id", existingMember.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return updatedMember;
    }

    // Username has not changed, so just return the existing member.
    return existingMember;
  }

  // Create a new member.
  const { data: newMember, error: insertError } = await supabase
    .from("members")
    .insert({
      discord_id: user.id,
      discord_username: user.username,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newMember;
}
