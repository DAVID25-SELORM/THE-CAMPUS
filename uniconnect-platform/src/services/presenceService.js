import { supabase } from "./supabase";

export async function setOnlinePresence(userId, universityId, online = true) {
  if (!userId || !universityId) return;
  return supabase.from("user_presence").upsert({
    user_id: userId,
    university_id: universityId,
    online,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export async function fetchPresence(universityId) {
  return supabase.from("user_presence").select("*").eq("university_id", universityId);
}

export function subscribeToPresence(universityId, onPresence) {
  return supabase
    .channel(`presence:${universityId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_presence",
        filter: `university_id=eq.${universityId}`
      },
      onPresence
    )
    .subscribe();
}
