-- Enable RLS on the two tables that were omitted from the initial RLS migration.
-- Both need special treatment because they have no org_id for isolation.

-- tos_versions: public read-only reference data — all authenticated users may SELECT,
-- but only the service role (used by backend code) can write.
ALTER TABLE public.tos_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read ON public.tos_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- processed_webhooks: internal idempotency table — no client access whatsoever.
-- Service role bypasses RLS, so backend webhook handlers still work.
-- Enabling RLS with zero USING policies blocks anon and authenticated roles entirely.
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
