import { supabase } from "./supabase";

const profileUuidFields = [
  "university_id",
  "faculty_id",
  "department_id",
  "programme_id",
  "course_id"
];

const enrollmentUuidFields = [
  "user_id",
  ...profileUuidFields
];

function normalizePayload(payload, uuidFields) {
  return Object.fromEntries(
    Object.entries(payload).flatMap(([key, value]) => {
      if (value === undefined) return [];
      if (uuidFields.includes(key) && value === "") return [[key, null]];
      return [[key, value]];
    })
  );
}

export async function getUniversities() {
  return supabase.from("universities").select("*").order("name");
}

export async function getDepartments(universityId) {
  return supabase.from("departments").select("*").eq("university_id", universityId).order("name");
}

export async function getFaculties(universityId) {
  return supabase.from("faculties").select("*").eq("university_id", universityId).order("name");
}

export async function getProgrammes(universityId, filters = {}) {
  const queryFilters = typeof filters === "string" ? { department_id: filters } : filters;
  let query = supabase.from("academic_programmes").select("*").eq("university_id", universityId);
  if (queryFilters.faculty_id) query = query.eq("faculty_id", queryFilters.faculty_id);
  if (queryFilters.department_id) query = query.eq("department_id", queryFilters.department_id);
  return query.order("name");
}

export async function getCourses(universityId, filters = {}) {
  const runQuery = (queryFilters) => {
    let query = supabase.from("courses").select("*").eq("university_id", universityId);
    if (queryFilters.faculty_id) query = query.eq("faculty_id", queryFilters.faculty_id);
    if (queryFilters.department_id) query = query.eq("department_id", queryFilters.department_id);
    if (queryFilters.programme_id) query = query.eq("programme_id", queryFilters.programme_id);
    if (queryFilters.level) query = query.eq("level", String(queryFilters.level));
    if (queryFilters.session) query = query.contains("sessions", [queryFilters.session]);
    return query.order("name");
  };

  const exactResult = await runQuery(filters);
  if (exactResult.error || exactResult.data?.length || (!filters.programme_id && !filters.level && !filters.session)) {
    return exactResult;
  }

  if (filters.session) {
    const sessionFallbackResult = await runQuery({ ...filters, session: "" });
    if (sessionFallbackResult.error || sessionFallbackResult.data?.length) return sessionFallbackResult;
  }

  if (filters.programme_id && filters.level) {
    const programmeResult = await runQuery({ ...filters, level: "" });
    if (programmeResult.error || programmeResult.data?.length) return programmeResult;
  }

  if (filters.programme_id && filters.level && filters.session) {
    const programmeSessionResult = await runQuery({ ...filters, level: "", session: "" });
    if (programmeSessionResult.error || programmeSessionResult.data?.length) return programmeSessionResult;
  }

  if (filters.department_id && filters.programme_id) {
    const departmentLevelResult = await runQuery({ ...filters, programme_id: "", session: "" });
    if (departmentLevelResult.error || departmentLevelResult.data?.length) return departmentLevelResult;
  }

  if (filters.department_id) {
    return runQuery({ faculty_id: filters.faculty_id, department_id: filters.department_id });
  }

  return exactResult;
}

export async function getAcademicLevels(universityId) {
  return supabase.from("academic_levels").select("*").eq("university_id", universityId).order("sort_order");
}

export async function getAcademicSessions(universityId) {
  return supabase.from("academic_sessions").select("*").eq("university_id", universityId).order("name");
}

export async function updateStudentProfile(userId, payload) {
  if (!userId) {
    return { data: null, error: { message: "Sign in before updating your profile." } };
  }

  const profilePayload = normalizePayload({ id: userId, ...payload }, profileUuidFields);
  const updateResult = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (updateResult.error || updateResult.data) return updateResult;

  return supabase
    .from("profiles")
    .insert(profilePayload)
    .select()
    .single();
}

export async function fetchProfileUniversities(userId) {
  return supabase
    .from("profile_universities")
    .select("*, universities(name, short_name), faculties(name, code), departments(name), academic_programmes(name), courses(name, code)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function upsertProfileUniversity(payload) {
  const enrollmentPayload = normalizePayload(payload, enrollmentUuidFields);

  return supabase
    .from("profile_universities")
    .upsert(enrollmentPayload, { onConflict: "user_id,university_id,student_id" })
    .select()
    .single();
}
