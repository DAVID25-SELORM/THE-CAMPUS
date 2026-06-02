-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Storage RLS policies for the "campus" bucket                   ║
-- ║                                                                  ║
-- ║  All app files live in one bucket with subfolders:              ║
-- ║    campus/avatars/{userId}/avatar.{ext}                         ║
-- ║    campus/feed/{userId}/{timestamp}.{ext}                       ║
-- ║    campus/resources/{userId}/{timestamp}.{ext}                  ║
-- ║    campus/news/{userId}/{timestamp}.{ext}                       ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Drop any old policies first (idempotent)
drop policy if exists "campus public read"       on storage.objects;
drop policy if exists "campus authenticated upload" on storage.objects;
drop policy if exists "campus own file update"   on storage.objects;
drop policy if exists "campus own file delete"   on storage.objects;

-- 1. Anyone (including unauthenticated) can read public files
create policy "campus public read"
  on storage.objects for select
  using ( bucket_id = 'campus' );

-- 2. Authenticated users can upload files under their own user-ID folder.
--    Path structure: {subfolder}/{userId}/...
--    The 2nd path segment (split on '/') must equal the caller's user ID.
create policy "campus authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campus'
    and (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- 3. Users can replace/update only their own files
create policy "campus own file update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campus'
    and (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- 4. Users can delete only their own files
create policy "campus own file delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campus'
    and (string_to_array(name, '/'))[2] = auth.uid()::text
  );
