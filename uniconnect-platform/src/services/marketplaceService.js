import { supabase } from "./supabase";

export async function fetchMarketplaceItems(universityId) {
  const result = await supabase
    .from("marketplace_items")
    .select("*, profiles(full_name), marketplace_categories(name, icon)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });

  if (!result.error) return result;

  return supabase
    .from("marketplace_items")
    .select("*, profiles(full_name)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function fetchMarketplaceCategories(universityId) {
  const result = await supabase
    .from("marketplace_categories")
    .select("*")
    .eq("university_id", universityId)
    .order("name");

  if (result.error) return { data: [], error: result.error };
  return result;
}

export async function createMarketplaceItem(payload) {
  return supabase.from("marketplace_items").insert(payload).select().single();
}
