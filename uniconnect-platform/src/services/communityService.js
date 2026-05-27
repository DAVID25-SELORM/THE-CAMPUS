import { supabase } from "./supabase";

export async function fetchCommunities(universityId) {
  return supabase.from("communities").select("*, community_members(id)").eq("university_id", universityId).order("created_at", { ascending: false });
}

export async function createCommunity(payload) {
  return supabase.from("communities").insert(payload).select().single();
}

export async function joinCommunity(community_id, user_id) {
  return supabase.from("community_members").upsert({ community_id, user_id, role: "member" }, { onConflict: "community_id,user_id" });
}
