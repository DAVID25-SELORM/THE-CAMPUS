import { supabase } from "./supabase";

export async function fetchNews(universityId, filters = {}) {
  let query = supabase
    .from("campus_news")
    .select("*, profiles:author_id(full_name, avatar_url, role)")
    .eq("university_id", universityId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  return query;
}

export async function createNews(payload) {
  return supabase.from("campus_news").insert(payload).select().single();
}

export async function updateNews(id, payload) {
  return supabase.from("campus_news").update(payload).eq("id", id).select().single();
}

export async function deleteNews(id) {
  return supabase.from("campus_news").delete().eq("id", id);
}

export async function markNewsRead(newsId, userId) {
  return supabase.from("news_reads").upsert(
    { news_id: newsId, user_id: userId },
    { onConflict: "news_id,user_id" }
  );
}

export function subscribeToNews(universityId, onChange) {
  return supabase
    .channel(`news:${universityId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "campus_news",
      filter: `university_id=eq.${universityId}`
    }, onChange)
    .subscribe();
}

export const NEWS_CATEGORIES = [
  { value: "general",   label: "General",   color: "text-cyan-200" },
  { value: "academic",  label: "Academic",  color: "text-blue-300" },
  { value: "sports",    label: "Sports",    color: "text-green-300" },
  { value: "health",    label: "Health",    color: "text-red-300" },
  { value: "emergency", label: "Emergency", color: "text-red-400" },
];
