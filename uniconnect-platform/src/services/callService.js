import { supabase } from "./supabase";

export async function createCallSession({ conversation_id, university_id, started_by, call_type }) {
  return supabase
    .from("call_sessions")
    .insert({ conversation_id, university_id, started_by, call_type, status: "ringing" })
    .select()
    .single();
}

export async function fetchActiveCall(conversationId) {
  return supabase
    .from("call_sessions")
    .select("*")
    .eq("conversation_id", conversationId)
    .in("status", ["ringing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function updateCallSession(callId, payload) {
  return supabase
    .from("call_sessions")
    .update(payload)
    .eq("id", callId)
    .select()
    .single();
}

export async function endCallSession(callId) {
  return updateCallSession(callId, {
    status: "ended",
    ended_at: new Date().toISOString()
  });
}

export async function sendCallSignal({ call_id, sender_id, signal_type, payload }) {
  return supabase
    .from("call_signals")
    .insert({ call_id, sender_id, signal_type, payload })
    .select()
    .single();
}

export async function fetchCallSignals(callId) {
  return supabase
    .from("call_signals")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: true });
}

export function subscribeToCallSessions(conversationId, onChange) {
  return supabase
    .channel(`calls:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "call_sessions",
        filter: `conversation_id=eq.${conversationId}`
      },
      onChange
    )
    .subscribe();
}

export function subscribeToCallSignals(callId, onSignal) {
  return supabase
    .channel(`call-signals:${callId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `call_id=eq.${callId}`
      },
      onSignal
    )
    .subscribe();
}
