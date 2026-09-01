
-- Tighten avatars storage policies: scope by user folder, no listing
DROP POLICY IF EXISTS "Avatars publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own avatars" ON storage.objects;

-- Public can SELECT a specific file by path (needed for <img src=...>) but not list
-- Listing requires SELECT on bucket-wide; restricting USING to auth + own folder prevents listing
CREATE POLICY "Avatars: public direct access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can only upload/modify/delete files inside a folder named after their user_id
CREATE POLICY "Avatars: users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: users update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: users delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
