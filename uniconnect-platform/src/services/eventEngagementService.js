import { supabase } from "./supabase";

export async function fetchEventStats(eventId) {
  const [rsvps, tickets, checkins, feedback] = await Promise.all([
    supabase.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
    supabase.from("event_tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("event_checkins").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("event_feedback").select("id", { count: "exact", head: true }).eq("event_id", eventId)
  ]);

  return {
    rsvps: rsvps.count || 0,
    tickets: tickets.count || 0,
    checkins: checkins.count || 0,
    feedback: feedback.count || 0
  };
}

export async function fetchEventEngagementSummary(eventIds) {
  if (!eventIds?.length) return {};

  const [rsvps, tickets, checkins, feedback] = await Promise.all([
    supabase.from("event_rsvps").select("event_id, status").in("event_id", eventIds),
    supabase.from("event_tickets").select("event_id").in("event_id", eventIds),
    supabase.from("event_checkins").select("event_id").in("event_id", eventIds),
    supabase.from("event_feedback").select("event_id").in("event_id", eventIds)
  ]);

  const summary = Object.fromEntries(eventIds.map(id => [id, {
    rsvps: 0,
    tickets: 0,
    checkins: 0,
    feedback: 0,
    score: 0
  }]));

  (rsvps.data || []).forEach(row => {
    if (row.status === "going" && summary[row.event_id]) summary[row.event_id].rsvps += 1;
  });
  (tickets.data || []).forEach(row => {
    if (summary[row.event_id]) summary[row.event_id].tickets += 1;
  });
  (checkins.data || []).forEach(row => {
    if (summary[row.event_id]) summary[row.event_id].checkins += 1;
  });
  (feedback.data || []).forEach(row => {
    if (summary[row.event_id]) summary[row.event_id].feedback += 1;
  });

  Object.values(summary).forEach(item => {
    item.score = item.rsvps + item.tickets + (item.checkins * 2) + item.feedback;
  });

  return summary;
}

export async function rsvpEvent({ university_id, event_id, user_id, status = "going" }) {
  return supabase.from("event_rsvps").upsert(
    { university_id, event_id, user_id, status },
    { onConflict: "event_id,user_id" }
  ).select().single();
}

export async function getMyRsvp(eventId, userId) {
  return supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function issueTicket({ university_id, event_id, buyer_id, amount = 0, ticket_type = "regular" }) {
  return supabase.from("event_tickets").upsert({
    university_id,
    event_id,
    buyer_id,
    amount,
    ticket_type,
    payment_status: amount > 0 ? "unpaid" : "free"
  }, { onConflict: "event_id,buyer_id" }).select().single();
}

export async function getMyEventTicket(eventId, userId) {
  return supabase
    .from("event_tickets")
    .select("*")
    .eq("event_id", eventId)
    .eq("buyer_id", userId)
    .maybeSingle();
}

export async function fetchMyTickets(userId) {
  return supabase
    .from("event_tickets")
    .select("*, events(title, event_date, location)")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });
}

export async function checkInWithTicket({ university_id, event_id, user_id, ticket_id = null, checked_in_by = null }) {
  const checkin = await supabase.from("event_checkins").insert({
    university_id,
    event_id,
    user_id,
    ticket_id,
    checked_in_by,
    checkin_method: ticket_id ? "qr" : "manual"
  }).select().single();

  if (!checkin.error && ticket_id) {
    await supabase
      .from("event_tickets")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", ticket_id);
  }

  return checkin;
}

export async function createEventAnnouncement({ university_id, event_id, author_id, title, body }) {
  return supabase.from("event_announcements").insert({
    university_id,
    event_id,
    author_id,
    title,
    body
  }).select().single();
}

export async function fetchEventAnnouncements(eventId) {
  return supabase
    .from("event_announcements")
    .select("*, profiles:author_id(full_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
}

export async function submitEventFeedback({ university_id, event_id, user_id, rating, comment }) {
  return supabase.from("event_feedback").upsert(
    { university_id, event_id, user_id, rating, comment },
    { onConflict: "event_id,user_id" }
  ).select().single();
}
