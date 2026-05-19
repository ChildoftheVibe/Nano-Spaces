-- ─────────────────────────────────────────────────────────────────────────────
-- Conflict detection — partial index on active reservations only
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_reservations_conflict
  ON public.reservations (location_id, start_time, end_time)
  WHERE status IN ('pending', 'confirmed');

-- User query index
CREATE INDEX idx_reservations_user
  ON public.reservations (org_id, booked_by, start_time);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seat counting — active non-hibernated profiles per org
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_seat_count
  ON public.profiles (org_id, hibernate_status, is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- Bell / notification queries — ordered by newest first
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_bell
  ON public.notifications (user_id, read, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin activity log browsing — newest first per org
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_activity_log_admin
  ON public.activity_log (org_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Full-text search — stored tsvector columns + GIN indexes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN title_fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;

ALTER TABLE public.locations
  ADD COLUMN name_fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;

ALTER TABLE public.profiles
  ADD COLUMN full_name_fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(full_name, ''))) STORED;

CREATE INDEX idx_reservations_fts ON public.reservations USING GIN (title_fts);
CREATE INDEX idx_locations_fts     ON public.locations    USING GIN (name_fts);
CREATE INDEX idx_profiles_fts      ON public.profiles     USING GIN (full_name_fts);
