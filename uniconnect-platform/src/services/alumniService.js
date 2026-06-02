import { supabase } from "./supabase";

export async function fetchAlumni(universityId, filters = {}) {
  let query = supabase
    .from("alumni_profiles")
    .select("*, profiles:id(full_name, avatar_url, university_id, universities(name, short_name))")
    .eq("university_id", universityId)
    .order("graduation_year", { ascending: false });

  if (filters.open_to_mentoring) query = query.eq("open_to_mentoring", true);
  if (filters.graduation_year)   query = query.eq("graduation_year", filters.graduation_year);
  return query;
}

export async function fetchMyAlumniProfile(userId) {
  return supabase
    .from("alumni_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
}

export async function upsertAlumniProfile(payload) {
  return supabase
    .from("alumni_profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
}

export async function toggleAlumniStatus(userId, universityId, isAlumni) {
  return supabase
    .from("profiles")
    .update({ is_alumni: isAlumni, academic_status: isAlumni ? "alumni" : "student" })
    .eq("id", userId);
}
