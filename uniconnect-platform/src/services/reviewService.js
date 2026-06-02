import { supabase } from "./supabase";

export async function fetchCourseReviews(universityId, courseId = null) {
  let query = supabase
    .from("course_reviews")
    .select("*, profiles:reviewer_id(full_name, avatar_url), courses(name, code)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });

  if (courseId) query = query.eq("course_id", courseId);
  return query;
}

export async function createCourseReview(payload) {
  return supabase.from("course_reviews").upsert(
    payload,
    { onConflict: "course_id,reviewer_id" }
  ).select().single();
}

export async function deleteCourseReview(id) {
  return supabase.from("course_reviews").delete().eq("id", id);
}

export function averageRating(reviews) {
  if (!reviews?.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
