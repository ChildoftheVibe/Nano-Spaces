-- Phase 7: Room management — room-photos storage bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-photos',
  'room-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "room photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-photos');

CREATE POLICY "authenticated users can upload room photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'room-photos' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update room photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'room-photos' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete room photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'room-photos' AND auth.role() = 'authenticated');
