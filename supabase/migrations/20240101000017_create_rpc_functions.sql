-- ─────────────────────────────────────────────────────────────────────────────
-- create_reservation_with_locks
-- Acquires row-level locks on overlapping active reservations, checks for
-- conflicts, then inserts reservation + notification + activity log atomically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_reservation_with_locks(
  p_location_id uuid,
  p_booked_by   uuid,
  p_org_id      uuid,
  p_title       text,
  p_notes       text,
  p_start_time  timestamptz,
  p_end_time    timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
  v_conflict_count int;
BEGIN
  -- Lock all overlapping active reservations to prevent concurrent double-bookings.
  -- tstzrange overlap (&&) correctly handles half-open intervals [start, end).
  PERFORM id FROM public.reservations
  WHERE location_id = p_location_id
    AND status IN ('pending', 'confirmed')
    AND tstzrange(start_time, end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)')
  FOR UPDATE;

  -- Re-count under the locks
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.reservations
  WHERE location_id = p_location_id
    AND status IN ('pending', 'confirmed')
    AND tstzrange(start_time, end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT'
      USING HINT = 'The requested time slot overlaps with an existing reservation';
  END IF;

  INSERT INTO public.reservations (
    location_id, booked_by, org_id, title, notes, start_time, end_time, status
  ) VALUES (
    p_location_id, p_booked_by, p_org_id, p_title, p_notes,
    p_start_time, p_end_time, 'confirmed'
  ) RETURNING id INTO v_reservation_id;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, action_url)
  VALUES (
    p_booked_by,
    p_org_id,
    'reservation_confirmed',
    'Booking Confirmed',
    format('Your booking "%s" has been confirmed.', p_title),
    format('/reservations/%s', v_reservation_id)
  );

  INSERT INTO public.activity_log (org_id, actor_id, action, target_type, target_id, details)
  VALUES (
    p_org_id,
    p_booked_by,
    'reservation.created',
    'reservation',
    v_reservation_id,
    jsonb_build_object(
      'title',       p_title,
      'location_id', p_location_id,
      'start_time',  p_start_time,
      'end_time',    p_end_time
    )
  );

  RETURN v_reservation_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- release_ghost_reservation
-- Locks the reservation, sets status to 'released', notifies the booker,
-- and logs the action — all in one transaction.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_ghost_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING HINT = 'Reservation not found';
  END IF;

  -- No-op if already in a terminal state
  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RETURN;
  END IF;

  UPDATE public.reservations SET status = 'released' WHERE id = p_reservation_id;

  IF v_res.booked_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, body, action_url)
    VALUES (
      v_res.booked_by,
      v_res.org_id,
      'reservation_released',
      'Booking Released',
      format(
        'Your booking "%s" was released — check-in was not completed within the required window.',
        v_res.title
      ),
      format('/reservations/%s', p_reservation_id)
    );
  END IF;

  INSERT INTO public.activity_log (org_id, actor_id, action, target_type, target_id, details)
  VALUES (
    v_res.org_id,
    v_res.booked_by,
    'reservation.ghost_released',
    'reservation',
    p_reservation_id,
    jsonb_build_object(
      'title',           v_res.title,
      'original_status', v_res.status,
      'reason',          'ghost_buster'
    )
  );
END;
$$;
