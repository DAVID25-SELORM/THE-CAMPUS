import React, { useEffect, useState } from "react";
import { CalendarCheck, Ticket, QrCode, Megaphone, Star } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  checkInWithTicket,
  createEventAnnouncement,
  fetchEventAnnouncements,
  fetchEventStats,
  getMyEventTicket,
  getMyRsvp,
  issueTicket,
  rsvpEvent,
  submitEventFeedback
} from "../../services/eventEngagementService";

export default function EventEngagementPanel({ event }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState({ rsvps: 0, tickets: 0, checkins: 0, feedback: 0 });
  const [myRsvp, setMyRsvp] = useState(null);
  const [myTicket, setMyTicket] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [info, setInfo] = useState("");

  async function load() {
    if (!event?.id || !user?.id) return;
    setStats(await fetchEventStats(event.id));

    const rsvp = await getMyRsvp(event.id, user.id);
    setMyRsvp(rsvp.data || null);

    const ticket = await getMyEventTicket(event.id, user.id);
    setMyTicket(ticket.data || null);

    const news = await fetchEventAnnouncements(event.id);
    setAnnouncements(news.data || []);
  }

  useEffect(() => { load(); }, [event?.id, user?.id]);

  async function handleRsvp(status) {
    const { error } = await rsvpEvent({
      university_id: profile.university_id,
      event_id: event.id,
      user_id: user.id,
      status
    });
    if (error) return toast(error.message, "error");
    toast(`RSVP saved — ${status}.`, "success");
    load();
  }

  async function handleTicket() {
    const { data, error } = await issueTicket({
      university_id: profile.university_id,
      event_id: event.id,
      buyer_id: user.id,
      amount: 0
    });
    if (error) return toast(error.message, "error");
    setMyTicket(data);
    setInfo(`Ticket ready. Code: ${data.ticket_code}`);
    load();
  }

  async function handleSelfCheckin() {
    const { error } = await checkInWithTicket({
      university_id: profile.university_id,
      event_id: event.id,
      user_id: user.id,
      ticket_id: myTicket?.id || null,
      checked_in_by: user.id
    });
    if (error) return toast(error.message, "error");
    toast("Check-in successful.", "success");
    load();
  }

  async function handleAnnouncement(e) {
    e.preventDefault();
    const { error } = await createEventAnnouncement({
      university_id: profile.university_id,
      event_id: event.id,
      author_id: user.id,
      title: announcement.title,
      body: announcement.body
    });
    if (error) return toast(error.message, "error");
    setAnnouncement({ title: "", body: "" });
    toast("Announcement posted.", "success");
    load();
  }

  async function handleFeedback(e) {
    e.preventDefault();
    const { error } = await submitEventFeedback({
      university_id: profile.university_id,
      event_id: event.id,
      user_id: user.id,
      rating: Number(feedback.rating),
      comment: feedback.comment
    });
    if (error) return toast(error.message, "error");
    setFeedback({ rating: 5, comment: "" });
    toast("Feedback submitted.", "success");
    load();
  }

  return (
    <div className="card mt-4">
      <h3 className="text-xl font-black">Campus Engagement</h3>

      {/* Ticket code info display */}
      {info && (
        <div className="card mt-4 border-cyan-300/30 text-cyan-100">
          <p className="font-mono font-black">{info}</p>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <div className="card"><p className="muted text-xs">RSVPs</p><h4 className="text-2xl font-black">{stats.rsvps}</h4></div>
        <div className="card"><p className="muted text-xs">Tickets</p><h4 className="text-2xl font-black">{stats.tickets}</h4></div>
        <div className="card"><p className="muted text-xs">Check-ins</p><h4 className="text-2xl font-black">{stats.checkins}</h4></div>
        <div className="card"><p className="muted text-xs">Feedback</p><h4 className="text-2xl font-black">{stats.feedback}</h4></div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <button
          onClick={() => handleRsvp("going")}
          className={`btn flex items-center justify-center gap-2 ${myRsvp?.status === "going" ? "" : "btn-secondary"}`}
        >
          <CalendarCheck size={18} /> {myRsvp?.status === "going" ? "Going ✓" : "RSVP Going"}
        </button>
        <button
          onClick={handleTicket}
          className={`btn flex items-center justify-center gap-2 ${myTicket ? "" : "btn-secondary"}`}
          disabled={Boolean(myTicket)}
        >
          <Ticket size={18} /> {myTicket ? "Ticket Issued ✓" : "Get Ticket"}
        </button>
        <button
          onClick={handleSelfCheckin}
          className="btn btn-secondary flex items-center justify-center gap-2"
        >
          <QrCode size={18} /> Self Check-in
        </button>
      </div>

      {myTicket && (
        <div className="card mt-4 grid md:grid-cols-[160px_1fr] gap-4 items-center">
          <div className="aspect-square rounded-2xl border border-white/10 bg-white p-3 grid grid-cols-4 gap-1">
            {Array.from({ length: 16 }).map((_, index) => {
              const code = myTicket.ticket_code || "";
              const charCode = code.charCodeAt(index % Math.max(code.length, 1)) || index;
              const active = (charCode + index) % 3 !== 0;
              return <span key={index} className={active ? "bg-slate-950 rounded-sm" : "bg-white rounded-sm"} />;
            })}
          </div>
          <div>
            <h4 className="font-black">Your Ticket</h4>
            <p className="muted mt-2 text-sm">Show this code for QR-ready attendance verification.</p>
            <p className="font-mono text-lg font-black mt-3 break-all">{myTicket.ticket_code}</p>
            <span className="badge mt-3 inline-flex">{myTicket.checked_in ? "Checked in ✓" : "Not checked in"}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <form onSubmit={handleAnnouncement} className="card">
          <h4 className="font-black flex items-center gap-2"><Megaphone size={18} /> Announcement</h4>
          <input
            className="input mt-3"
            placeholder="Announcement title"
            value={announcement.title}
            onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
            required
          />
          <textarea
            className="input mt-3 min-h-[80px]"
            placeholder="Announcement body"
            value={announcement.body}
            onChange={e => setAnnouncement({ ...announcement, body: e.target.value })}
          />
          <button className="btn mt-3">Post Announcement</button>
        </form>

        <form onSubmit={handleFeedback} className="card">
          <h4 className="font-black flex items-center gap-2"><Star size={18} /> Feedback</h4>
          <select
            className="input mt-3"
            value={feedback.rating}
            onChange={e => setFeedback({ ...feedback, rating: e.target.value })}
          >
            <option value="5">5 Stars — Excellent</option>
            <option value="4">4 Stars — Good</option>
            <option value="3">3 Stars — Average</option>
            <option value="2">2 Stars — Poor</option>
            <option value="1">1 Star — Very poor</option>
          </select>
          <textarea
            className="input mt-3 min-h-[80px]"
            placeholder="Comment (optional)"
            value={feedback.comment}
            onChange={e => setFeedback({ ...feedback, comment: e.target.value })}
          />
          <button className="btn mt-3">Submit Feedback</button>
        </form>
      </div>

      <div className="mt-5">
        <h4 className="font-black">Announcements</h4>
        <div className="grid gap-3 mt-3">
          {announcements.length === 0 && <p className="muted text-sm">No announcements yet.</p>}
          {announcements.map(item => (
            <div className="card" key={item.id}>
              <h5 className="font-black">{item.title}</h5>
              <p className="muted mt-1 text-sm">{item.body}</p>
              <p className="muted text-xs mt-2">By {item.profiles?.full_name || "Organizer"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
