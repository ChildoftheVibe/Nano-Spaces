-- Fix storage RLS: restrict org-logos writes to the uploader's own org prefix.
-- The previous policies allowed any authenticated user to write to any org's
-- storage path, bypassing the API layer's org_admin check entirely.

-- Drop overly-permissive write policies
DROP POLICY IF EXISTS "org admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "org admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "org admins can delete logos" ON storage.objects;

-- Recreate with path-prefix ownership check:
-- The storage path is {org_id}/{uuid}.{ext} — first folder must match the
-- authenticated user's org_id, and the user must be an org_admin or super_admin.

CREATE POLICY "org admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT org_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('org_admin', 'super_admin')
  );

CREATE POLICY "org admins can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT org_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('org_admin', 'super_admin')
  );

CREATE POLICY "org admins can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT org_id::text
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('org_admin', 'super_admin')
  );
