import { supabase } from "./supabase";

const tableConfig = {
  faculties: { order: "name" },
  departments: { order: "name" },
  academic_programmes: { order: "name" },
  courses: { order: "name" },
  academic_levels: { order: "sort_order" },
  academic_sessions: { order: "name" },
  campuses: { order: "name" }
};

export async function listAcademicTable(table, universityId, filters = {}) {
  const config = tableConfig[table];
  if (!config) throw new Error(`Unsupported academic table: ${table}`);

  let query = supabase.from(table).select("*").eq("university_id", universityId);

  Object.entries(filters).forEach(([key, value]) => {
    if (value) query = query.eq(key, value);
  });

  return query.order(config.order);
}

export async function loadAcademicSetup(universityId) {
  const [
    faculties,
    departments,
    programmes,
    courses,
    levels,
    sessions,
    campuses
  ] = await Promise.all([
    listAcademicTable("faculties", universityId),
    listAcademicTable("departments", universityId),
    listAcademicTable("academic_programmes", universityId),
    listAcademicTable("courses", universityId),
    listAcademicTable("academic_levels", universityId),
    listAcademicTable("academic_sessions", universityId),
    listAcademicTable("campuses", universityId)
  ]);

  return { faculties, departments, programmes, courses, levels, sessions, campuses };
}

export async function upsertAcademicRecord(table, payload) {
  const config = tableConfig[table];
  if (!config) throw new Error(`Unsupported academic table: ${table}`);

  return supabase
    .from(table)
    .upsert({ ...payload, source_status: payload.source_status || "admin_modified" })
    .select()
    .single();
}
