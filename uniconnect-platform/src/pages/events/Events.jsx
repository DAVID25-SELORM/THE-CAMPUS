import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createEvent, fetchEventCategories, fetchEvents } from "../../services/eventService";
import { fetchEventEngagementSummary } from "../../services/eventEngagementService";
import EmptyState from "../../components/EmptyState";
import { SearchableSelect } from "../../components/SearchableSelect";
import EventEngagementPanel from "./EventEngagementPanel";

const eventTypes = [
  "General",
  "Fellowship",
  "Conference",
  "Seminar",
  "Debate",
  "Workshop",
  "Sports",
  "Career",
  "Worship Night"
];

export default function Events() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [engagement, setEngagement] = useState({});
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    event_date: "",
    event_type: "General",
    category_id: ""
  });

  async function load() {
    if (!profile?.university_id) return;
    const [{ data: eventRows }, { data: categoryRows }] = await Promise.all([
      fetchEvents(profile.university_id),
      fetchEventCategories(profile.university_id)
    ]);
    const nextEvents = eventRows || [];
    setEvents(nextEvents);
    setCategories(categoryRows || []);
    setEngagement(await fetchEventEngagementSummary(nextEvents.map(event => event.id)));
  }

  useEffect(() => {
    load();
  }, [profile?.university_id]);

  async function submit(e) {
    e.preventDefault();

    const { error } = await createEvent({
      ...form,
      category_id: form.category_id || null,
      university_id: profile.university_id,
      created_by: user.id
    });

    if (error) return toast(error.message, "error");

    setForm({ title: "", description: "", location: "", event_date: "", event_type: "General", category_id: "" });
    load();
  }

  const trendingEvents = events
    .map(event => ({ ...event, engagement: engagement[event.id] || { score: 0, rsvps: 0, tickets: 0, checkins: 0 } }))
    .filter(event => event.engagement.score > 0)
    .sort((a, b) => b.engagement.score - a.engagement.score)
    .slice(0, 3);

  return (
    <div>
      <h1 className="text-3xl font-black">Events & Campus Engagement</h1>
      <p className="muted mt-2">
        Campus programs, RSVP, free tickets, check-ins, announcements, and feedback.
      </p>

      {trendingEvents.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-black">Trending on Campus</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-3">
            {trendingEvents.map(event => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className="card text-left hover:bg-white/10 transition"
              >
                <span className="badge">{event.event_type || "General"}</span>
                <h3 className="font-black mt-3">{event.title}</h3>
                <p className="muted text-sm mt-2">
                  {event.engagement.rsvps} RSVPs / {event.engagement.tickets} tickets / {event.engagement.checkins} check-ins
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={submit} className="card mt-6 grid md:grid-cols-2 gap-3">
        <input
          className="input"
          placeholder="Event title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />

        <input
          className="input"
          placeholder="Location"
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
        />

        <input
          className="input"
          type="datetime-local"
          value={form.event_date}
          onChange={e => setForm({ ...form, event_date: e.target.value })}
          required
        />

        <select
          className="input"
          value={form.event_type}
          onChange={e => setForm({ ...form, event_type: e.target.value })}
        >
          {eventTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>

        <SearchableSelect
          id="event-category"
          placeholder="Type or choose category"
          value={form.category_id}
          options={categories.map(category => ({ value: category.id, label: category.name }))}
          onChange={value => setForm({ ...form, category_id: value })}
        />

        <input
          className="input"
          placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <button className="btn md:col-span-2">Create Event</button>
      </form>

      <div className="grid gap-4 mt-6">
        {events.length === 0 && (
          <EmptyState title="No events yet" message="Create the first campus event." />
        )}

        {events.map(ev => {
          const open = selectedEventId === ev.id;

          return (
            <div className="card" key={ev.id}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge">{ev.event_type || "General"}</span>
                    {ev.event_categories?.name && <span className="badge">{ev.event_categories.name}</span>}
                  </div>
                  <h3 className="text-xl font-black">{ev.title}</h3>
                  <p className="muted mt-2">{ev.description}</p>
                  <p className="mt-4 font-bold">{ev.location}</p>
                  <p className="muted text-sm mt-2">
                    {(engagement[ev.id]?.rsvps || 0)} RSVPs / {(engagement[ev.id]?.tickets || 0)} tickets / {(engagement[ev.id]?.checkins || 0)} check-ins
                  </p>
                  <p className="badge mt-3">
                    {ev.event_date ? new Date(ev.event_date).toLocaleString() : "No date"}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedEventId(open ? null : ev.id)}
                  className="btn btn-secondary"
                >
                  {open ? "Hide Engagement" : "Open Engagement"}
                </button>
              </div>

              {open && <EventEngagementPanel event={ev} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
