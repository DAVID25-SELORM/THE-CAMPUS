import { supabase } from "./supabase";

export async function fetchTutors(universityId, filters = {}) {
  let query = supabase
    .from("tutor_listings")
    .select("*, profiles:tutor_id(full_name, avatar_url, level, departments(name))")
    .eq("university_id", universityId)
    .eq("available", true)
    .order("rating", { ascending: false });

  if (filters.mode) query = query.eq("mode", filters.mode);
  return query;
}

export async function createTutorListing(payload) {
  return supabase.from("tutor_listings").insert(payload).select().single();
}

export async function updateTutorListing(id, payload) {
  return supabase.from("tutor_listings").update(payload).eq("id", id).select().single();
}

export async function deleteTutorListing(id) {
  return supabase.from("tutor_listings").delete().eq("id", id);
}

export async function fetchMyTutorListing(userId) {
  return supabase
    .from("tutor_listings")
    .select("*")
    .eq("tutor_id", userId)
    .maybeSingle();
}
