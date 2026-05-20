-- Phase 11: God Mode override, audit chain, activity log viewer, marketing panel

-- ─── 1. God Mode columns on reservations ──────────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS god_mode_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS god_mode_reason text,
  ADD COLUMN IF NOT EXISTS god_mode_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_booker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Full-text search on reservation title ─────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS title_fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_reservations_title_fts
  ON public.reservations USING gin(title_fts);

-- ─── 3. God Mode index ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_god_mode
  ON public.reservations (org_id, created_at DESC)
  WHERE god_mode_override = true;

-- ─── 4. audit_chain table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_chain (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  chain_head_hash text      NOT NULL,
  row_count     bigint      NOT NULL DEFAULT 0,
  last_entry_id uuid        REFERENCES public.activity_log(id) ON DELETE SET NULL,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  tamper_detected boolean   NOT NULL DEFAULT false
);

ALTER TABLE public.audit_chain ENABLE ROW LEVEL SECURITY;

-- Only service-role (admin client) can access; no authenticated policies = blocked
-- Super admin reads via admin client which bypasses RLS

CREATE INDEX IF NOT EXISTS idx_audit_chain_org
  ON public.audit_chain (org_id, computed_at DESC);
