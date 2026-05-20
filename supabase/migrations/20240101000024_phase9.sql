-- Phase 9: recurring reservations, waitlist, approval workflow, check-in

-- ─── 1. Status check — add waitlisted ────────────────────────────────────────
DO $$
DECLARE v_cname text;
BEGIN
  SELECT conname INTO v_cname
  FROM pg_constraint
  WHERE conrelid = 'public.reservations'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%'
  LIMIT 1;
  IF v_cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', v_cname);
  END IF;
END $$;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending','confirmed','cancelled','flagged','released','waitlisted'));

-- ─── 2. Waitlist columns on reservations ─────────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS waitlist_expires_at timestamptz;

-- ─── 3. Waitlist toggle on locations ─────────────────────────────────────────
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false;

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_waitlisted
  ON public.reservations (location_id, start_time, end_time, created_at)
  WHERE status = 'waitlisted';

CREATE INDEX IF NOT EXISTS idx_reservations_waitlist_expires
  ON public.reservations (waitlist_expires_at)
  WHERE status = 'waitlisted' AND waitlist_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_recurring_group
  ON public.reservations (recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_pending_org
  ON public.reservations (org_id, status, created_at)
  WHERE status = 'pending';

-- ─── 5. activate_next_waitlist ────────────────────────────────────────────────
-- Finds the earliest waiter for a slot that has no active hold, gives them
-- a 30-minute window, and sends an in-app notification.
CREATE OR REPLACE FUNCTION public.activate_next_waitlist(
  p_location_id uuid,
  p_start_time  timestamptz,
  p_end_time    timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_entry
  FROM public.reservations
  WHERE location_id = p_location_id
    AND start_time  = p_start_time
    AND end_time    = p_end_time
    AND status      = 'waitlisted'
    AND (waitlist_expires_at IS NULL OR waitlist_expires_at < now())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.reservations
  SET waitlist_expires_at = now() + interval '30 minutes'
  WHERE id = v_entry.id;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, action_url)
  VALUES (
    v_entry.booked_by,
    v_entry.org_id,
    'waitlist_available',
    'Your Spot is Available!',
    format('A slot opened for "%s". You have 30 minutes to confirm your booking.', v_entry.title),
    format('/calendar?activate_waitlist=%s', v_entry.id::text)
  );
END;
$$;

-- ─── 6. process_waitlist_slot ─────────────────────────────────────────────────
-- Called after a reservation is cancelled to offer the slot to the first waiter.
CREATE OR REPLACE FUNCTION public.process_waitlist_slot(
  p_location_id uuid,
  p_start_time  timestamptz,
  p_end_time    timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only advance if the slot is now truly free
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE location_id = p_location_id
      AND status IN ('pending','confirmed')
      AND tstzrange(start_time, end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)')
  ) THEN
    RETURN;
  END IF;

  PERFORM public.activate_next_waitlist(p_location_id, p_start_time, p_end_time);
END;
$$;

-- ─── 7. advance_expired_waitlist ─────────────────────────────────────────────
-- Cron: expire stale holds and promote the next waiter in line.
CREATE OR REPLACE FUNCTION public.advance_expired_waitlist()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    public.reservations%ROWTYPE;
  v_count  int := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM public.reservations
    WHERE status = 'waitlisted'
      AND waitlist_expires_at IS NOT NULL
      AND waitlist_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.reservations
    SET status = 'cancelled', cancelled_at = now(),
        cancellation_reason = 'Waitlist hold expired'
    WHERE id = v_row.id;

    PERFORM public.activate_next_waitlist(v_row.location_id, v_row.start_time, v_row.end_time);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── 8. confirm_from_waitlist ────────────────────────────────────────────────
-- Atomically converts a waitlisted entry to confirmed/pending.
CREATE OR REPLACE FUNCTION public.confirm_from_waitlist(p_reservation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res            public.reservations%ROWTYPE;
  v_conflict_count int;
  v_approval       boolean;
  v_new_status     text;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id AND status = 'waitlisted'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_WAITLISTED'; END IF;
  IF v_res.waitlist_expires_at IS NULL OR v_res.waitlist_expires_at < now() THEN
    RAISE EXCEPTION 'WAITLIST_EXPIRED';
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.reservations
  WHERE location_id = v_res.location_id
    AND status IN ('pending','confirmed')
    AND tstzrange(start_time, end_time, '[)') && tstzrange(v_res.start_time, v_res.end_time, '[)');

  IF v_conflict_count > 0 THEN RAISE EXCEPTION 'BOOKING_CONFLICT'; END IF;

  SELECT approval_required INTO v_approval FROM public.locations WHERE id = v_res.location_id;
  v_new_status := CASE WHEN v_approval THEN 'pending' ELSE 'confirmed' END;

  UPDATE public.reservations
  SET status = v_new_status, waitlist_expires_at = NULL
  WHERE id = p_reservation_id;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, action_url)
  VALUES (
    v_res.booked_by, v_res.org_id,
    CASE WHEN v_new_status = 'confirmed' THEN 'reservation_confirmed' ELSE 'reservation_pending' END,
    CASE WHEN v_new_status = 'confirmed' THEN 'Booking Confirmed' ELSE 'Booking Pending Approval' END,
    format('Your booking "%s" has been %s.',
      v_res.title,
      CASE WHEN v_new_status = 'confirmed' THEN 'confirmed' ELSE 'submitted for approval' END),
    '/calendar'
  );

  INSERT INTO public.activity_log (org_id, actor_id, action, target_type, target_id, details)
  VALUES (
    v_res.org_id, v_res.booked_by, 'reservation.confirmed_from_waitlist',
    'reservation', p_reservation_id,
    jsonb_build_object('title', v_res.title, 'status', v_new_status)
  );

  RETURN v_new_status;
END;
$$;
