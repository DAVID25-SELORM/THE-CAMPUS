import React, { useEffect, useState } from "react";
import { CalendarCheck, Ticket, QrCode, Megaphone, Star } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
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
  const [stats, setStats] = useState({ rsvps: 0, tickets: 0, checkins: 0, feedback: 0 });
  const [myRsvp, setMyRsvp] = useState(null);
  const [myTicket, setMyTicket] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    load();
  }, [event?.id, user?.id]);

  async function handleRsvp(status) {
    const { error } = await rsvpEvent({
      university_id: profile.university_id,
      event_id: event.id,
      user_id: user.id,
      status
    });

    if (error) return setMessage(error.message);
    setMessage(`RSVP saved as ${status}.`);
    load();
  }

  async function handleTicket() {
    const { data, error } = await issueTicket({
      university_id: profile.university_id,
      event_id: event.id,
      buyer_id: user.id,
      amount: 0
    });

    if (error) return setMessage(error.message);
    setMyTicket(data);
    setMessage(`Ticket ready. Code: ${data.ticket_code}`);
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

    if (error) return setMessage(error.message);
    setMessage("Check-in successful.");
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

    if (error) return setMessage(error.message);
    setAnnouncement({ title: "", body: "" });
    setMessage("Announcement posted.");
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

    if (error) return setMessage(error.message);
    setFeedback({ rating: 5, comment: "" });
    setMessage("Feedback submitted.");
    load();
  }

  return (
    <div className="card mt-4">
      <h3 className="text-xl font-black">Campus Engagement</h3>

      {message && <div className="card mt-4">{message}</div>}

      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <div className="card"><p className="muted text-xs">RSVPs</p><h4 className="text-2xl font-black">{stats.rsvps}</h4></div>
        <div className="card"><p className="muted text-xs">Tickets</p><h4 className="text-2xl font-black">{stats.tickets}</h4></div>
        <div className="card"><p className="muted text-xs">Check-ins</p><h4 className="text-2xl font-black">{stats.checkins}</h4></div>
        <div className="card"><p className="muted text-xs">Feedback</p><h4 className="text-2xl font-black">{stats.feedback}</h4></div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <button onClick={() => handleRsvp("going")} className="btn btn-secondary flex items-center justify-center gap-2">
          <CalendarCheck size={18} /> {myRsvp?.status === "going" ? "Going" : "RSVP Going"}
        </button>
        <button onClick={handleTicket} className="btn btn-secondary flex items-center justify-center gap-2">
          <Ticket size={18} /> Get Ticket
        </button>
        <button onClick={handleSelfCheckin} className="btn btn-secondary flex items-center justify-center gap-2">
          <QrCode size={18} /> Self Check-in
        </button>
      </div>

      {myTicket && (
        <div className="card mt-4 grid md:grid-cols-[180px_1fr] gap-4 items-center">
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
            <p className="muted mt-2">Use this code for QR-ready attendance verification.</p>
            <p className="font-mono text-lg font-black mt-3 break-all">{myTicket.ticket_code}</p>
            <p className="badge mt-3">{myTicket.checked_in ? "Checked in" : "Not checked in"}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <form onSubmit={handleAnnouncement} className="card">
          <h4 className="font-black flex items-center gap-2"><Megaphone size={18} /> Event Announcement</h4>
          <input className="input mt-3" placeholder="Announcement title" value={announcement.title} onChange={e => setAnnouncement({...announcement, title: e.target.value})} required />
          <textarea className="input mt-3 min-h-[90px]" placeholder="Announcement body" value={announcement.body} onChange={e => setAnnouncement({...announcement, body: e.target.value})} />
          <button className="btn mt-3">Post Announcement</button>
        </form>

        <form onSubmit={handleFeedback} className="card">
          <h4 className="font-black flex items-center gap-2"><Star size={18} /> Feedback</h4>
          <select className="input mt-3" value={feedback.rating} onChange={e => setFeedback({...feedback, rating: e.target.value})}>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <textarea className="input mt-3 min-h-[90px]" placeholder="Comment" value={feedback.comment} onChange={e => setFeedback({...feedback, comment: e.target.value})} />
          <button className="btn mt-3">Submit Feedback</button>
        </form>
      </div>

      <div className="mt-5">
        <h4 className="font-black">Announcements</h4>
        <div className="grid gap-3 mt-3">
          {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
          {announcements.map(item => (
            <div className="card" key={item.id}>
              <h5 className="font-black">{item.title}</h5>
              <p className="muted mt-1">{item.body}</p>
              <p className="muted text-xs mt-2">By {item.profiles?.full_name || "Organizer"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
