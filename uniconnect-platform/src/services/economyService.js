
import { supabase } from "./supabase";

export async function fetchMarketplaceDashboard(universityId) {
  const [items, orders, reviews] = await Promise.all([
    supabase.from("marketplace_items").select("id", { count: "exact", head: true }).eq("university_id", universityId),
    supabase.from("marketplace_orders").select("id", { count: "exact", head: true }).eq("university_id", universityId),
    supabase.from("marketplace_reviews").select("id", { count: "exact", head: true }).eq("university_id", universityId)
  ]);

  return {
    items: items.count || 0,
    orders: orders.count || 0,
    reviews: reviews.count || 0
  };
}

export async function createOrder(payload) {
  return supabase.from("marketplace_orders").insert(payload).select().single();
}

export async function createReview(payload) {
  return supabase.from("marketplace_reviews").upsert(
    payload,
    { onConflict: "item_id,reviewer_id" }
  ).select().single();
}

export async function fetchItemReviews(itemIds) {
  if (!itemIds?.length) return { data: [], error: null };
  return supabase
    .from("marketplace_reviews")
    .select("*, profiles:reviewer_id(full_name)")
    .in("item_id", itemIds)
    .order("created_at", { ascending: false });
}

export async function fetchVendorVerifications(universityId) {
  return supabase
    .from("vendor_verifications")
    .select("*")
    .eq("university_id", universityId);
}

export async function requestVendorVerification(payload) {
  return supabase.from("vendor_verifications").insert(payload).select().single();
}

export async function createPaymentIntent(payload) {
  return supabase.from("payment_intents").insert(payload).select().single();
}

export async function fetchWallet(userId) {
  return supabase.from("student_wallets").select("*").eq("user_id", userId).maybeSingle();
}

export async function fetchWalletTransactions(userId) {
  return supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}
