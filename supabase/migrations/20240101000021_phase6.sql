-- Phase 6: Billing, invoices, trial tracking

-- Track trial reminder emails sent
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_day7_sent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_day13_sent boolean NOT NULL DEFAULT false;

-- Create invoices storage bucket (private — signed URLs for downloads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Only service role can read/write invoice PDFs
CREATE POLICY "service role can manage invoices"
  ON storage.objects FOR ALL
  USING (bucket_id = 'invoices' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'service_role');

-- Org admins can read their own org's invoices via signed URL (handled in API layer)
-- No user-facing SELECT policy — downloads go through API which returns signed URLs

-- Index for webhook idempotency checks
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event_id ON public.processed_webhooks (event_id);

-- Index for billing queries
CREATE INDEX IF NOT EXISTS idx_invoices_org_created ON public.invoices (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orgs_trial_ends ON public.organizations (subscription_status, trial_ends_at)
  WHERE subscription_status = 'trial';
CREATE INDEX IF NOT EXISTS idx_orgs_expires_at ON public.organizations (subscription_status, subscription_expires_at)
  WHERE subscription_status = 'active';
