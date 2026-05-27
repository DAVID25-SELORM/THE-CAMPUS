import { supabase } from "./supabase";

export async function fetchStudentsInUniversity(universityId, currentUserId) {
  return supabase
    .from("profiles")
    .select("id, full_name, avatar_url, student_id, level, verification_status")
    .eq("university_id", universityId)
    .neq("id", currentUserId)
    .order("full_name");
}

export async function fetchConversations(userId) {
  return supabase
    .from("conversation_members")
    .select(`
      id,
      last_read_at,
      conversation_id,
      conversations (
        id,
        title,
        type,
        updated_at,
        created_at,
        conversation_members (
          user_id,
          profiles (id, full_name, avatar_url)
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function createDirectConversation({ university_id, currentUserId, otherUserId }) {
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({ university_id, type: "direct", created_by: currentUserId })
    .select()
    .single();

  if (convError) return { data: null, error: convError };

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversation.id, user_id: currentUserId, role: "member" },
      { conversation_id: conversation.id, user_id: otherUserId, role: "member" }
    ]);

  if (membersError) return { data: null, error: membersError };
  return { data: conversation, error: null };
}

export async function createGroupConversation({ university_id, currentUserId, title, memberIds }) {
  const uniqueMembers = Array.from(new Set([currentUserId, ...(memberIds || [])]));
  if (!title?.trim()) return { data: null, error: new Error("Group title is required") };
  if (uniqueMembers.length < 2) return { data: null, error: new Error("Select at least one student") };

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({ university_id, title: title.trim(), type: "group", created_by: currentUserId })
    .select()
    .single();

  if (convError) return { data: null, error: convError };

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert(uniqueMembers.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === currentUserId ? "admin" : "member"
    })));

  if (membersError) return { data: null, error: membersError };
  return { data: conversation, error: null };
}

export async function fetchMessages(conversationId) {
  return supabase
    .from("messages")
    .select("*, profiles:sender_id(id, full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
}

export async function sendMessage({ conversation_id, sender_id, content, media_url = null, message_type = "text" }) {
  const clean = content?.trim();
  const cleanMediaUrl = media_url?.trim() || null;
  if (!clean && !cleanMediaUrl) return { data: null, error: new Error("Message cannot be empty") };

  const result = await supabase
    .from("messages")
    .insert({
      conversation_id,
      sender_id,
      content: clean || "",
      media_url: cleanMediaUrl,
      message_type: cleanMediaUrl ? message_type : "text"
    })
    .select()
    .single();

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation_id);

  return result;
}

export async function setTyping({ conversation_id, user_id, university_id, is_typing }) {
  return supabase
    .from("conversation_typing")
    .upsert({
      conversation_id,
      user_id,
      university_id,
      is_typing,
      updated_at: new Date().toISOString()
    }, { onConflict: "conversation_id,user_id" });
}

export async function fetchTyping(conversationId) {
  return supabase
    .from("conversation_typing")
    .select("*, profiles:user_id(full_name)")
    .eq("conversation_id", conversationId)
    .eq("is_typing", true);
}

export async function markConversationRead({ conversation_id, user_id }) {
  return supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversation_id)
    .eq("user_id", user_id);
}

export function subscribeToTyping(conversationId, onTyping) {
  return supabase
    .channel(`typing:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversation_typing",
        filter: `conversation_id=eq.${conversationId}`
      },
      onTyping
    )
    .subscribe();
}

export function subscribeToMessages(conversationId, onMessage) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      onMessage
    )
    .subscribe();
}
