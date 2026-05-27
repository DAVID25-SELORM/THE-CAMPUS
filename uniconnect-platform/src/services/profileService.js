import { supabase } from "./supabase";

export async function getUniversities() {
  return supabase.from("universities").select("*").order("name");
}

export async function getDepartments(universityId) {
  return supabase.from("departments").select("*").eq("university_id", universityId).order("name");
}

export async function updateStudentProfile(userId, payload) {
  return supabase
    .from("profiles")
    .upsert({ id: userId, ...payload }, { onConflict: "id" })
    .select()
    .single();
}

export async function fetchProfileUniversities(userId) {
  return supabase
    .from("profile_universities")
    .select("*, universities(name, short_name), departments(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function upsertProfileUniversity(payload) {
  return supabase
    .from("profile_universities")
    .upsert(payload, { onConflict: "user_id,university_id,student_id" })
    .select()
    .single();
}
