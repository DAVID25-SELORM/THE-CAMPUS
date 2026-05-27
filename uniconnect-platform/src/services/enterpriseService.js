import { supabase } from "./supabase";

export async function fetchPlatformOverview() {
  const [universities, students, posts, events, marketplace, elections] = await Promise.all([
    supabase.from("universities").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("marketplace_items").select("id", { count: "exact", head: true }),
    supabase.from("elections").select("id", { count: "exact", head: true })
  ]);

  return {
    universities: universities.count || 0,
    students: students.count || 0,
    posts: posts.count || 0,
    events: events.count || 0,
    marketplace: marketplace.count || 0,
    elections: elections.count || 0
  };
}

export async function fetchSubscriptionPlans() {
  return supabase.from("subscription_plans").select("*").order("price");
}

export async function fetchUniversitySubscription(universityId) {
  return supabase
    .from("university_subscriptions")
    .select("*, subscription_plans(name, price, billing_cycle)")
    .eq("university_id", universityId)
    .maybeSingle();
}

export async function saveWhiteLabelSettings(payload) {
  return supabase
    .from("white_label_settings")
    .upsert(payload, { onConflict: "university_id" })
    .select()
    .single();
}

export async function fetchWhiteLabelSettings(universityId) {
  return supabase
    .from("white_label_settings")
    .select("*")
    .eq("university_id", universityId)
    .maybeSingle();
}

export async function createSponsorCampaign(payload) {
  return supabase.from("sponsor_campaigns").insert(payload).select().single();
}

export async function fetchSponsorCampaigns(universityId) {
  return supabase
    .from("sponsor_campaigns")
    .select("*")
    .or(`university_id.eq.${universityId},university_id.is.null`)
    .order("created_at", { ascending: false });
}

export async function createReferral(payload) {
  return supabase.from("referrals").insert(payload).select().single();
}

export async function fetchApiClients(universityId) {
  return supabase
    .from("api_clients")
    .select("*")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function createNationalIdVerification(payload) {
  return supabase.from("national_id_verifications").insert(payload).select().single();
}

export async function fetchNationalIdVerifications(universityId) {
  return supabase
    .from("national_id_verifications")
    .select("*, profiles:user_id(full_name, student_id)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function createSubscriptionPayment(payload) {
  return supabase.from("subscription_payments").insert(payload).select().single();
}

export async function fetchSubscriptionPayments(universityId) {
  return supabase
    .from("subscription_payments")
    .select("*")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function fetchAdPlacements(universityId) {
  return supabase
    .from("ad_placements")
    .select("*")
    .or(`university_id.eq.${universityId},university_id.is.null`)
    .order("created_at", { ascending: false });
}

export async function createAdCreative(payload) {
  return supabase.from("ad_creatives").insert(payload).select().single();
}

export async function fetchAdCreatives() {
  return supabase
    .from("ad_creatives")
    .select("*, sponsor_campaigns(title, sponsor_name), ad_placements(name, surface)")
    .order("created_at", { ascending: false });
}

export async function createAdEvent(payload) {
  return supabase.from("ad_events").insert(payload).select().single();
}

export async function fetchAdEvents(universityId) {
  return supabase
    .from("ad_events")
    .select("*")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function createFinancialSettlement(payload) {
  return supabase.from("financial_settlements").insert(payload).select().single();
}

export async function fetchFinancialSettlements(universityId) {
  return supabase
    .from("financial_settlements")
    .select("*")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}
