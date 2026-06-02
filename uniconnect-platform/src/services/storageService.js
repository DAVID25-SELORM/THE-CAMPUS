import { supabase } from "./supabase";

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Bust cache by appending a timestamp
  const url = `${data.publicUrl}?t=${Date.now()}`;
  return { url, error: null };
}
