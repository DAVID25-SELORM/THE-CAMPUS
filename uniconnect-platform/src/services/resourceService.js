import { supabase } from "./supabase";

const BUCKET = "resources";

export async function uploadResourceFile(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function fetchResources(universityId, filters = {}) {
  let query = supabase
    .from("study_resources")
    .select("*, profiles:uploader_id(full_name, avatar_url), faculties(name), departments(name), courses(name, code)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });

  if (filters.faculty_id)    query = query.eq("faculty_id", filters.faculty_id);
  if (filters.department_id) query = query.eq("department_id", filters.department_id);
  if (filters.resource_type) query = query.eq("resource_type", filters.resource_type);
  if (filters.level)         query = query.eq("level", filters.level);

  return query;
}

export async function createResource(payload) {
  return supabase.from("study_resources").insert(payload).select().single();
}

export async function deleteResource(id) {
  return supabase.from("study_resources").delete().eq("id", id);
}

export async function recordDownload(resourceId, userId) {
  await supabase.from("resource_downloads").upsert(
    { resource_id: resourceId, user_id: userId },
    { onConflict: "resource_id,user_id" }
  );
  // Increment counter
  await supabase.rpc("increment_resource_downloads", { resource_id: resourceId }).catch(() => {
    supabase.from("study_resources")
      .select("download_count")
      .eq("id", resourceId)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase.from("study_resources")
            .update({ download_count: (data.download_count || 0) + 1 })
            .eq("id", resourceId);
        }
      });
  });
}
