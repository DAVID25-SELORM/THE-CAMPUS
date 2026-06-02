import React, { useEffect, useRef, useState } from "react";
import { Image, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import EmptyState from "../../components/EmptyState";
import { addComment, createPost, fetchPosts, subscribeToNewPosts } from "../../services/postService";
import { fetchReactions, REACTIONS, removeReaction, setReaction, summariseReactions } from "../../services/reactionService";
import { uploadAvatar } from "../../services/storageService";
import { supabase } from "../../services/supabase";

function ReactionBar({ post, userId, onReact }) {
  const [open, setOpen] = useState(false);
  const { counts, myReaction, total } = summariseReactions(post._reactions, userId);

  async function react(type) {
    setOpen(false);
    if (myReaction === type) {
      await removeReaction(post.id, userId);
    } else {
      await setReaction(post.id, userId, type);
    }
    onReact();
  }

  const topReaction = REACTIONS.find(r => r.type === myReaction) || REACTIONS[0];

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen(!open)}
          className={`btn btn-secondary flex gap-2 items-center text-sm ${myReaction ? "border-cyan-300/50" : ""}`}
        >
          {myReaction ? topReaction.emoji : "👍"} {myReaction ? topReaction.label : "React"}
          {total > 0 && <span className="muted">({total})</span>}
        </button>
        {/* Top reactions summary */}
        {Object.entries(counts).slice(0, 3).map(([type, count]) => {
          const r = REACTIONS.find(rx => rx.type === type);
          return r ? (
            <span key={type} className="text-xs muted">{r.emoji} {count}</span>
          ) : null;
        })}
      </div>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 flex gap-1 card p-2 z-20 shadow-2xl">
          {REACTIONS.map(r => (
            <button
              key={r.type}
              onClick={() => react(r.type)}
              title={r.label}
              className={`text-2xl hover:scale-125 transition ${myReaction === r.type ? "grayscale-0 opacity-100" : "opacity-80 hover:opacity-100"}`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [commentingId, setCommentingId] = useState("");
  const fileRef = useRef(null);
  const channelRef = useRef(null);

  async function loadReactions(postList) {
    const withReactions = await Promise.all(
      postList.map(async post => {
        const { data } = await fetchReactions(post.id);
        return { ...post, _reactions: data || [] };
      })
    );
    return withReactions;
  }

  async function load() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchPosts(profile.university_id);
    if (error) { toast(error.message, "error"); return; }
    const withReactions = await loadReactions(data || []);
    setPosts(withReactions);
  }

  useEffect(() => { load(); }, [profile?.university_id]);

  useEffect(() => {
    if (!profile?.university_id) return;
    channelRef.current = subscribeToNewPosts(profile.university_id, () => load());
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [profile?.university_id]);

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setBusy(true);

    let media_url = null;
    if (imageFile) {
      const { url, error: uploadError } = await uploadAvatar(user.id + "/feed", imageFile);
      if (uploadError) { toast(uploadError.message, "error"); setBusy(false); return; }
      media_url = url;
    }

    const { error } = await createPost({
      university_id: profile.university_id,
      author_id: user.id,
      content,
      media_url
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setContent("");
    clearImage();
    load();
  }

  async function submitComment(e, postId) {
    e.preventDefault();
    const comment = commentDrafts[postId]?.trim();
    if (!comment) return;
    setCommentingId(postId);
    const { error } = await addComment({ post_id: postId, author_id: user.id, content: comment });
    setCommentingId("");
    if (error) return toast(error.message, "error");
    setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
    load();
  }

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Select your university before accessing your campus feed." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Campus Feed</h1>
          <p className="muted mt-1">Posts from verified students in your university.</p>
        </div>
        <span className="badge">{profile?.universities?.name}</span>
      </div>

      {/* Post composer */}
      <form onSubmit={submit} className="card mt-6">
        <div className="flex gap-3">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="h-10 w-10 rounded-2xl object-cover shrink-0" alt="" />
            : <div className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center font-black shrink-0">{profile?.full_name?.[0] || "U"}</div>
          }
          <textarea
            className="input flex-1 min-h-[90px]"
            placeholder="Share something with your campus…"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        {imagePreview && (
          <div className="relative mt-3 inline-block">
            <img src={imagePreview} className="max-h-56 rounded-2xl border border-white/10" alt="Preview" />
            <button type="button" onClick={clearImage} className="absolute top-2 right-2 btn btn-secondary p-1 rounded-full">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary flex items-center gap-2 text-sm">
              <Image size={16} /> Photo
            </button>
          </div>
          <button className="btn" disabled={busy}>{busy ? "Posting…" : "Post"}</button>
        </div>
      </form>

      {/* Feed */}
      <div className="grid gap-4 mt-6">
        {posts.length === 0 && <EmptyState title="No posts yet" message="Be the first to start the conversation." />}
        {posts.map(post => (
          <article key={post.id} className="card">
            <div className="flex items-center gap-3">
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} className="h-11 w-11 rounded-2xl object-cover" alt="" />
                : <div className="h-11 w-11 rounded-2xl bg-white/10 grid place-items-center font-black">{post.profiles?.full_name?.[0] || "U"}</div>
              }
              <div>
                <h3 className="font-black">{post.profiles?.full_name || "Student"}</h3>
                <p className="muted text-xs">{new Date(post.created_at).toLocaleString()}</p>
              </div>
            </div>

            {post.content && <p className="mt-4 whitespace-pre-wrap">{post.content}</p>}

            {post.media_url && (
              <img
                src={post.media_url}
                alt="Post media"
                className="mt-4 w-full max-h-96 object-cover rounded-2xl border border-white/10 cursor-pointer"
                onClick={() => window.open(post.media_url, "_blank")}
              />
            )}

            <div className="flex gap-3 mt-5 flex-wrap">
              <ReactionBar
                post={post}
                userId={user.id}
                onReact={load}
              />
              <span className="btn btn-secondary flex gap-2 items-center cursor-default text-sm">
                <MessageCircle size={16} /> {post.comments?.length || 0}
              </span>
            </div>

            {/* Comments */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="grid gap-3">
                {(post.comments || []).slice(0, 3).map(comment => (
                  <div key={comment.id} className="rounded-2xl bg-black/20 border border-white/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{comment.profiles?.full_name || "Student"}</strong>
                      <span className="muted text-xs">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={e => submitComment(e, post.id)} className="mt-3 flex gap-2">
                <input
                  className="input"
                  placeholder="Write a comment…"
                  value={commentDrafts[post.id] || ""}
                  onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                />
                <button className="btn grid place-items-center min-w-12" disabled={commentingId === post.id} aria-label="Send comment">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
