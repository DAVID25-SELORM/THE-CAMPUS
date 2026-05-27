import { supabase } from "./supabase";

export async function fetchNotifications(userId) {
  return supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(full_name, avatar_url)")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function markNotificationRead(notificationId) {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select()
    .single();
}

export async function markAllNotificationsRead(userId) {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
}
