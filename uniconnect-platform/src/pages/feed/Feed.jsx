import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, ThumbsUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import EmptyState from "../../components/EmptyState";
import { addComment, createPost, fetchPosts, subscribeToNewPosts, toggleLike } from "../../services/postService";
import { supabase } from "../../services/supabase";

export default function Feed() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [commentingId, setCommentingId] = useState("");
  const channelRef = useRef(null);

  async function load() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchPosts(profile.university_id);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setPosts(data || []);
  }

  useEffect(() => {
    load();
  }, [profile?.university_id]);

  useEffect(() => {
    if (!profile?.university_id) return;

    channelRef.current = subscribeToNewPosts(profile.university_id, () => load());

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [profile?.university_id]);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const { error } = await createPost({
      university_id: profile.university_id,
      author_id: user.id,
      content
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setContent("");
    load();
  }

  async function submitComment(e, postId) {
    e.preventDefault();
    const comment = commentDrafts[postId]?.trim();
    if (!comment) return;

    setCommentingId(postId);
    const { error } = await addComment({
      post_id: postId,
      author_id: user.id,
      content: comment
    });
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
          <p className="muted mt-2">Posts from verified students in your university.</p>
        </div>
        <span className="badge">{profile?.universities?.name}</span>
      </div>

      <form onSubmit={submit} className="card mt-6">
        <textarea className="input min-h-[110px]" placeholder="Share something with your campus..." value={content} onChange={e => setContent(e.target.value)} />
        <div className="flex justify-end mt-3">
          <button className="btn" disabled={busy}>{busy ? "Posting..." : "Post"}</button>
        </div>
      </form>

      <div className="grid gap-4 mt-6">
        {posts.length === 0 && <EmptyState title="No posts yet" message="Be the first to start the conversation." />}
        {posts.map(post => (
          <article key={post.id} className="card">
            <div className="flex items-center gap-3">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="h-11 w-11 rounded-2xl object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-white/10 grid place-items-center font-black">
                  {post.profiles?.full_name?.[0] || "U"}
                </div>
              )}
              <div>
                <h3 className="font-black">{post.profiles?.full_name || "Student"}</h3>
                <p className="muted text-xs">{new Date(post.created_at).toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap">{post.content}</p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => toggleLike({ post_id: post.id, user_id: user.id }).then(load)}
                className={`btn btn-secondary flex gap-2 items-center ${post.likes?.some(l => l.user_id === user.id) ? "border-cyan-300/50 text-cyan-200" : ""}`}
              >
                <ThumbsUp size={16} /> {post.likes?.some(l => l.user_id === user.id) ? "Liked" : "Like"} ({post.likes?.length || 0})
              </button>
              <span className="btn btn-secondary flex gap-2 items-center cursor-default">
                <MessageCircle size={16} /> {post.comments?.length || 0}
              </span>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
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
                  placeholder="Write a comment..."
                  value={commentDrafts[post.id] || ""}
                  onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                />
                <button className="btn grid place-items-center min-w-12" disabled={commentingId === post.id} title="Send comment" aria-label="Send comment">
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
