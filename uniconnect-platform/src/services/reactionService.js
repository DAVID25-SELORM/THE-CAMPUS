import { supabase } from "./supabase";

export const REACTIONS = [
  { type: "like",  emoji: "👍", label: "Like" },
  { type: "love",  emoji: "❤️",  label: "Love" },
  { type: "laugh", emoji: "😂", label: "Haha" },
  { type: "wow",   emoji: "😮", label: "Wow"  },
  { type: "sad",   emoji: "😢", label: "Sad"  },
  { type: "fire",  emoji: "🔥", label: "Fire" },
];

export async function fetchReactions(postId) {
  return supabase
    .from("post_reactions")
    .select("reaction_type, user_id")
    .eq("post_id", postId);
}

export async function setReaction(postId, userId, reactionType) {
  return supabase
    .from("post_reactions")
    .upsert({ post_id: postId, user_id: userId, reaction_type: reactionType },
             { onConflict: "post_id,user_id" });
}

export async function removeReaction(postId, userId) {
  return supabase
    .from("post_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
}

export function summariseReactions(rows, currentUserId) {
  const counts = {};
  let myReaction = null;
  for (const row of rows || []) {
    counts[row.reaction_type] = (counts[row.reaction_type] || 0) + 1;
    if (row.user_id === currentUserId) myReaction = row.reaction_type;
  }
  return { counts, myReaction, total: rows?.length || 0 };
}
