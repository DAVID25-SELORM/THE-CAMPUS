/**
 * All files go into the single "campus" bucket that already exists.
 * Subfolders separate concerns:
 *   campus/avatars/{userId}/avatar.{ext}
 *   campus/feed/{userId}/{timestamp}.{ext}
 *   campus/resources/{userId}/{timestamp}.{ext}
 */
import { supabase } from "./supabase";

const BUCKET = "campus";

async function upload(path, file, upsert = true) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert, contentType: file.type });

  if (error) return { url: null, error };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}

/** Profile / avatar images */
export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return upload(`avatars/${userId}/avatar.${ext}`, file, true);
}

/** Feed post images */
export async function uploadFeedImage(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return upload(`feed/${userId}/${Date.now()}.${ext}`, file, false);
}

/** Study resource files (PDF, Word, PPT, etc.) */
export async function uploadResourceFile(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return upload(`resources/${userId}/${Date.now()}.${ext}`, file, false);
}

/** News / announcement cover images */
export async function uploadNewsCover(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return upload(`news/${userId}/${Date.now()}.${ext}`, file, false);
}
