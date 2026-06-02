import { supabase } from "./supabase";

export async function globalSearch(query, universityId) {
  if (!query?.trim() || !universityId) return { results: [], error: null };

  const q = query.trim().toLowerCase();

  const [people, posts, events, communities, resources, news] = await Promise.all([
    // People
    supabase.from("profiles")
      .select("id, full_name, avatar_url, level, student_id, departments(name)")
      .eq("university_id", universityId)
      .ilike("full_name", `%${q}%`)
      .limit(5),

    // Posts
    supabase.from("posts")
      .select("id, content, created_at, profiles:author_id(full_name)")
      .eq("university_id", universityId)
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5),

    // Events
    supabase.from("events")
      .select("id, title, event_date, location")
      .eq("university_id", universityId)
      .ilike("title", `%${q}%`)
      .limit(5),

    // Communities
    supabase.from("communities")
      .select("id, name, type, description")
      .eq("university_id", universityId)
      .ilike("name", `%${q}%`)
      .limit(5),

    // Resources
    supabase.from("study_resources")
      .select("id, title, resource_type, academic_year")
      .eq("university_id", universityId)
      .ilike("title", `%${q}%`)
      .limit(5),

    // News
    supabase.from("campus_news")
      .select("id, title, category, created_at")
      .eq("university_id", universityId)
      .ilike("title", `%${q}%`)
      .limit(5),
  ]);

  return {
    results: {
      people:      people.data      || [],
      posts:       posts.data       || [],
      events:      events.data      || [],
      communities: communities.data || [],
      resources:   resources.data   || [],
      news:        news.data        || [],
    },
    error: people.error || posts.error || events.error || communities.error
  };
}
