-- Phase 5: Org settings, invitations, user management

-- Add email_signature column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_signature text;

-- Create org-logos storage bucket (public read, service-role write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for org-logos bucket
CREATE POLICY "org logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

CREATE POLICY "org admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "org admins can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "org admins can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND auth.role() = 'authenticated'
  );
