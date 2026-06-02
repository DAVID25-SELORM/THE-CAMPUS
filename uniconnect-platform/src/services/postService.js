import { supabase } from "./supabase";

export async function fetchPosts(universityId) {
  return supabase
    .from("posts")
    .select(`
      *,
      profiles(full_name, avatar_url, verification_status),
      communities(id, name),
      comments(id, content, created_at, profiles(full_name, avatar_url)),
      likes(id, user_id)
    `)
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function createPost({ university_id, author_id, content, media_url = null, community_id = null }) {
  return supabase.from("posts").insert({ university_id, author_id, content, media_url, community_id }).select().single();
}

export async function addComment({ post_id, author_id, content }) {
  return supabase.from("comments").insert({ post_id, author_id, content }).select().single();
}

export async function toggleLike({ post_id, user_id }) {
  const existing = await supabase.from("likes").select("id").eq("post_id", post_id).eq("user_id", user_id).maybeSingle();
  if (existing.data?.id) return supabase.from("likes").delete().eq("id", existing.data.id);
  return supabase.from("likes").insert({ post_id, user_id });
}

export function subscribeToNewPosts(universityId, onInsert) {
  return supabase
    .channel(`feed:${universityId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "posts",
      filter: `university_id=eq.${universityId}`
    }, onInsert)
    .subscribe();
}
