import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Image, Phone, Plus, Search, Send, Users, Video } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import CallPanel from "./CallPanel";
import {
  createCallSession,
  fetchActiveCall,
  subscribeToCallSessions
} from "../../services/callService";
import {
  createDirectConversation,
  createGroupConversation,
  fetchConversations,
  fetchMessages,
  fetchStudentsInUniversity,
  fetchTyping,
  markConversationRead,
  sendMessage,
  setTyping,
  subscribeToMessages,
  subscribeToTyping
} from "../../services/messageService";
import { fetchPresence, subscribeToPresence } from "../../services/presenceService";
import { supabase } from "../../services/supabase";

function getConversationName(conversation, currentUserId) {
  if (conversation?.type === "group") return conversation.title || "Group Chat";
  const members = conversation?.conversation_members || [];
  const other = members.find(m => m.user_id !== currentUserId);
  return other?.profiles?.full_name || "Direct Message";
}

function isMediaImage(url) {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(url || "");
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [students, setStudents] = useState([]);
  const [presence, setPresence] = useState([]);
  const [typingRows, setTypingRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState("direct");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [callRole, setCallRole] = useState("caller");
  const [busy, setBusy] = useState(false);
  const typingTimer = useRef(null);

  const selectedConversation = selected?.conversations || selected;

  async function loadConversations() {
    if (!user?.id) return;
    const { data, error } = await fetchConversations(user.id);
    if (error) console.error("Conversation load error:", error.message);
    setConversations(data || []);
  }

  async function loadStudents() {
    if (!profile?.university_id || !user?.id) return;
    const { data, error } = await fetchStudentsInUniversity(profile.university_id, user.id);
    if (error) console.error("Student load error:", error.message);
    setStudents(data || []);
  }

  async function loadPresence() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchPresence(profile.university_id);
    if (error) console.error("Presence load error:", error.message);
    setPresence(data || []);
  }

  async function loadMessages(conversationId) {
    const { data, error } = await fetchMessages(conversationId);
    if (error) console.error("Messages load error:", error.message);
    setMessages(data || []);
    await markConversationRead({ conversation_id: conversationId, user_id: user.id });
  }

  async function loadTyping(conversationId) {
    const { data, error } = await fetchTyping(conversationId);
    if (error) console.error("Typing load error:", error.message);
    setTypingRows((data || []).filter(row => row.user_id !== user.id));
  }

  useEffect(() => {
    loadConversations();
    loadStudents();
    loadPresence();
  }, [user?.id, profile?.university_id]);

  useEffect(() => {
    if (!profile?.university_id) return;
    const channel = subscribeToPresence(profile.university_id, loadPresence);
    return () => supabase.removeChannel(channel);
  }, [profile?.university_id]);

  useEffect(() => {
    const conversationId = selectedConversation?.id;
    if (!conversationId) return;

    loadMessages(conversationId);
    loadTyping(conversationId);
    fetchActiveCall(conversationId).then(({ data }) => {
      setActiveCall(data || null);
      if (data) setCallRole(data.started_by === user.id ? "caller" : "callee");
    });

    const messageChannel = subscribeToMessages(conversationId, async payload => {
      await loadMessages(conversationId);
      const incoming = payload?.new;
      if (incoming?.sender_id !== user.id && "Notification" in window && Notification.permission === "granted") {
        new Notification(getConversationName(selectedConversation, user.id), {
          body: incoming.content || "Sent a media message"
        });
      }
    });
    const typingChannel = subscribeToTyping(conversationId, () => loadTyping(conversationId));
    const callChannel = subscribeToCallSessions(conversationId, payload => {
      const nextCall = payload.new;
      if (!nextCall || nextCall.status === "ended") {
        setActiveCall(null);
        return;
      }
      setActiveCall(nextCall);
      setCallRole(nextCall.started_by === user.id ? "caller" : "callee");
    });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(callChannel);
      setTyping({ conversation_id: conversationId, user_id: user.id, university_id: profile.university_id, is_typing: false });
    };
  }, [selectedConversation?.id]);

  async function startDirectChat(otherUserId) {
    setBusy(true);
    const { data, error } = await createDirectConversation({
      university_id: profile.university_id,
      currentUserId: user.id,
      otherUserId
    });
    setBusy(false);

    if (error) return alert(error.message);
    await loadConversations();
    setShowNew(false);
    setSelected(data);
  }

  async function startGroupChat() {
    setBusy(true);
    const { data, error } = await createGroupConversation({
      university_id: profile.university_id,
      currentUserId: user.id,
      title: groupTitle,
      memberIds: groupMembers
    });
    setBusy(false);

    if (error) return alert(error.message);
    await loadConversations();
    setShowNew(false);
    setGroupTitle("");
    setGroupMembers([]);
    setSelected(data);
  }

  async function submitMessage(e) {
    e.preventDefault();
    if (!selectedConversation?.id || (!draft.trim() && !mediaUrl.trim())) return;

    const text = draft;
    const nextMediaUrl = mediaUrl;
    setDraft("");
    setMediaUrl("");

    const { error } = await sendMessage({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: text,
      media_url: nextMediaUrl,
      message_type: nextMediaUrl ? "media" : "text"
    });

    await setTyping({ conversation_id: selectedConversation.id, user_id: user.id, university_id: profile.university_id, is_typing: false });
    if (error) alert(error.message);
  }

  async function startCall(callType) {
    if (!selectedConversation?.id) return;
    const { data, error } = await createCallSession({
      conversation_id: selectedConversation.id,
      university_id: profile.university_id,
      started_by: user.id,
      call_type: callType
    });
    if (error) return alert(error.message);
    setCallRole("caller");
    setActiveCall(data);
  }

  function handleDraftChange(value) {
    setDraft(value);
    if (!selectedConversation?.id) return;

    setTyping({ conversation_id: selectedConversation.id, user_id: user.id, university_id: profile.university_id, is_typing: Boolean(value.trim()) });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      setTyping({ conversation_id: selectedConversation.id, user_id: user.id, university_id: profile.university_id, is_typing: false });
    }, 1400);
  }

  function toggleGroupMember(studentId) {
    setGroupMembers(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  }

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const onlineUsers = useMemo(() => new Set(presence.filter(row => row.online).map(row => row.user_id)), [presence]);
  const typingNames = typingRows.map(row => row.profiles?.full_name || "Someone");

  if (!profile?.university_id) {
    return (
      <EmptyState
        title="Assign your account to a university"
        message="Messages are campus-scoped. Admin and student accounts need a university before they can see or message students."
        action={<Link to="/verify" className="btn inline-flex">Set University</Link>}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Messages</h1>
          <p className="muted mt-2">Direct chats, group chats, typing status, media links, and live presence.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn flex items-center justify-center gap-2">
          <Plus size={18} /> New Chat
        </button>
      </div>

      {showNew && (
        <div className="card mt-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setMode("direct")} className={`btn ${mode === "direct" ? "" : "btn-secondary"}`}>Direct</button>
            <button onClick={() => setMode("group")} className={`btn ${mode === "group" ? "" : "btn-secondary"}`}>Group</button>
            {"Notification" in window && Notification.permission !== "granted" && (
              <button onClick={() => Notification.requestPermission()} className="btn btn-secondary">Enable Browser Alerts</button>
            )}
          </div>

          {mode === "group" && (
            <input className="input mt-4" placeholder="Group title" value={groupTitle} onChange={e => setGroupTitle(e.target.value)} />
          )}

          <div className="flex items-center gap-2 mt-4">
            <Search size={18} className="muted" />
            <input className="input" placeholder="Search students by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => mode === "direct" ? startDirectChat(student.id) : toggleGroupMember(student.id)}
                disabled={busy}
                className={`card text-left hover:bg-white/10 transition ${groupMembers.includes(student.id) ? "border-cyan-300/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${onlineUsers.has(student.id) ? "bg-emerald-300" : "bg-white/20"}`} />
                  <div className="h-11 w-11 rounded-2xl bg-white/10 grid place-items-center font-black">
                    {student.full_name?.[0] || "S"}
                  </div>
                  <div>
                    <h3 className="font-black">{student.full_name}</h3>
                    <p className="muted text-xs">{student.student_id || "No Student ID"} / {student.level || "No level"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {mode === "group" && (
            <button onClick={startGroupChat} disabled={busy} className="btn mt-4">
              Create Group ({groupMembers.length + 1})
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 mt-6 min-h-[650px]">
        <aside className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-black flex items-center gap-2"><Users size={18} /> Conversations</h2>
          </div>

          <div className="divide-y divide-white/10">
            {conversations.length === 0 && (
              <div className="p-4">
                <EmptyState title="No chats yet" message="Start your first conversation." />
              </div>
            )}

            {conversations.map(row => {
              const conv = row.conversations;
              const active = selectedConversation?.id === conv?.id;
              return (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className={`w-full text-left p-4 hover:bg-white/10 ${active ? "bg-cyan-300/15" : ""}`}
                >
                  <h3 className="font-black">{getConversationName(conv, user.id)}</h3>
                  <p className="muted text-xs">{conv?.type || "direct"} / {conv?.updated_at ? new Date(conv.updated_at).toLocaleString() : ""}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="card p-0 overflow-hidden flex flex-col">
          {!selectedConversation?.id ? (
            <div className="grid place-items-center flex-1 p-6">
              <EmptyState title="Select a conversation" message="Choose a chat or start a new one." />
            </div>
          ) : (
            <>
              <header className="p-4 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{getConversationName(selectedConversation, user.id)}</h2>
                    <p className="muted text-sm">{selectedConversation.type === "group" ? "Group conversation" : "Direct conversation"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startCall("audio")} disabled={Boolean(activeCall)} className="btn btn-secondary" title="Start audio call" aria-label="Start audio call">
                      <Phone size={18} />
                    </button>
                    <button onClick={() => startCall("video")} disabled={Boolean(activeCall)} className="btn btn-secondary" title="Start video call" aria-label="Start video call">
                      <Video size={18} />
                    </button>
                  </div>
                </div>
                {typingNames.length > 0 && <p className="text-cyan-100 text-sm mt-1">{typingNames.join(", ")} typing...</p>}
              </header>

              {activeCall && (
                <div className="px-4">
                  <CallPanel
                    call={activeCall}
                    role={callRole}
                    user={user}
                    conversationName={getConversationName(selectedConversation, user.id)}
                    onClose={() => setActiveCall(null)}
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 grid gap-3 content-start max-h-[520px]">
                {messages.map(msg => {
                  const own = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-3xl px-4 py-3 ${own ? "bg-cyan-300 text-slate-950" : "bg-white/10"}`}>
                        {!own && <p className="text-xs font-bold mb-1 opacity-80">{msg.profiles?.full_name || "Student"}</p>}
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        {msg.media_url && (
                          <div className="mt-2">
                            {isMediaImage(msg.media_url) ? (
                              <img className="max-h-56 rounded-2xl border border-black/10" src={msg.media_url} alt="Shared media" />
                            ) : (
                              <a className="underline font-bold" href={msg.media_url} target="_blank" rel="noreferrer">Open attachment</a>
                            )}
                          </div>
                        )}
                        <p className={`text-[10px] mt-2 ${own ? "text-slate-700" : "muted"}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submitMessage} className="p-4 border-t border-white/10 grid gap-3">
                <div className="flex gap-3">
                  <input className="input" placeholder="Type your message..." value={draft} onChange={e => handleDraftChange(e.target.value)} />
                  <button className="btn flex items-center gap-2"><Send size={18} /> Send</button>
                </div>
                <div className="flex gap-3 items-center">
                  <Image size={18} className="muted" />
                  <input className="input" placeholder="Optional media URL" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
