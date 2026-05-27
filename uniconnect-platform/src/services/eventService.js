import { supabase } from "./supabase";

export async function fetchEvents(universityId) {
  const result = await supabase
    .from("events")
    .select("*, profiles(full_name), event_categories(name, color)")
    .eq("university_id", universityId)
    .order("event_date");

  if (!result.error) return result;

  return supabase
    .from("events")
    .select("*, profiles(full_name)")
    .eq("university_id", universityId)
    .order("event_date");
}

export async function fetchEventCategories(universityId) {
  const result = await supabase
    .from("event_categories")
    .select("*")
    .eq("university_id", universityId)
    .order("name");

  if (result.error) return { data: [], error: result.error };
  return result;
}

export async function createEvent(payload) {
  return supabase.from("events").insert(payload).select().single();
}
