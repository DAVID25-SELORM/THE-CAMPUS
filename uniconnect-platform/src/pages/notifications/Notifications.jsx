import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../../services/notificationService";

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await fetchNotifications(user.id);
    if (error) console.error(error.message);
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  function dispatchBadgeRefresh() {
    window.dispatchEvent(new Event("notifications-updated"));
  }

  async function markRead(id) {
    const { error } = await markNotificationRead(id);
    if (error) return toast(error.message, "error");
    dispatchBadgeRefresh();
    load();
  }

  async function markAllRead() {
    const { error } = await markAllNotificationsRead(user.id);
    if (error) return toast(error.message, "error");
    dispatchBadgeRefresh();
    load();
  }

  const unreadCount = items.filter(item => !item.read_at).length;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Notifications</h1>
          <p className="muted mt-2">Comments, likes, and important campus activity.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary inline-flex items-center justify-center gap-2">
            <CheckCheck size={18} /> Mark all read
          </button>
        )}
      </div>

      <div className="grid gap-4 mt-6">
        {loading && <div className="card">Loading notifications...</div>}
        {!loading && items.length === 0 && (
          <EmptyState title="No notifications yet" message="Replies and reactions to your posts will appear here." />
        )}
        {items.map(item => (
          <article key={item.id} className={`card ${item.read_at ? "" : "border-cyan-300/40"}`}>
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-cyan-300/15 text-cyan-100 grid place-items-center shrink-0">
                <Bell size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="font-black">{item.title}</h2>
                  <span className="muted text-xs">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                {item.body && <p className="muted mt-2 whitespace-pre-wrap">{item.body}</p>}
                {!item.read_at && (
                  <button onClick={() => markRead(item.id)} className="btn btn-secondary mt-4">
                    Mark read
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
