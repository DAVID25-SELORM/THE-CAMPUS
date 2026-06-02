import { supabase } from "./supabase";

export async function fetchTimetable(userId) {
  return supabase
    .from("timetable_entries")
    .select("*")
    .eq("user_id", userId)
    .order("day_of_week")
    .order("start_time");
}

export async function createTimetableEntry(payload) {
  return supabase.from("timetable_entries").insert(payload).select().single();
}

export async function updateTimetableEntry(id, payload) {
  return supabase.from("timetable_entries").update(payload).eq("id", id).select().single();
}

export async function deleteTimetableEntry(id) {
  return supabase.from("timetable_entries").delete().eq("id", id);
}

export async function fetchExams(userId) {
  return supabase
    .from("exam_schedule")
    .select("*")
    .eq("user_id", userId)
    .order("exam_date");
}

export async function createExam(payload) {
  return supabase.from("exam_schedule").insert(payload).select().single();
}

export async function deleteExam(id) {
  return supabase.from("exam_schedule").delete().eq("id", id);
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const ENTRY_COLORS = [
  "#00f5ff", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#3b82f6", "#ec4899", "#f97316"
];
