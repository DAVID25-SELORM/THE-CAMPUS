import { supabase } from "./supabase";

export async function fetchHostels(universityId, filters = {}) {
  let query = supabase
    .from("hostel_listings")
    .select("*, profiles:lister_id(full_name, avatar_url)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });

  if (filters.room_type)   query = query.eq("room_type", filters.room_type);
  if (filters.gender_type) query = query.eq("gender_type", filters.gender_type);
  if (filters.status)      query = query.eq("status", filters.status);
  return query;
}

export async function createHostel(payload) {
  return supabase.from("hostel_listings").insert(payload).select().single();
}

export async function updateHostel(id, payload) {
  return supabase.from("hostel_listings").update(payload).eq("id", id).select().single();
}

export async function deleteHostel(id) {
  return supabase.from("hostel_listings").delete().eq("id", id);
}

export const ROOM_TYPES = ["single", "double", "triple", "self-contained", "apartment"];
export const GENDER_TYPES = ["male", "female", "mixed"];
