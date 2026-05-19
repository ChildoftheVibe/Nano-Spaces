-- Phase 8: update create_reservation_with_locks to accept optional p_status
-- Default remains 'confirmed' to preserve backward compatibility.
CREATE OR REPLACE FUNCTION public.create_reservation_with_locks(
  p_location_id uuid,
  p_booked_by   uuid,
  p_org_id      uuid,
  p_title       text,
  p_notes       text,
  p_start_time  timestamptz,
  p_end_time    timestamptz,
  p_status      text DEFAULT 'confirmed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
  v_conflict_count int;
  v_notif_type  text;
  v_notif_title text;
  v_notif_body  text;
BEGIN
  -- Lock all overlapping active reservations to prevent concurrent double-bookings.
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
    p_location_id, p_booked_by, p_org_id, p_title,
    NULLIF(p_notes, ''), p_start_time, p_end_time, p_status
  ) RETURNING id INTO v_reservation_id;

  IF p_status = 'confirmed' THEN
    v_notif_type  := 'reservation_confirmed';
    v_notif_title := 'Booking Confirmed';
    v_notif_body  := format('Your booking "%s" has been confirmed.', p_title);
  ELSE
    v_notif_type  := 'reservation_pending';
    v_notif_title := 'Booking Pending Approval';
    v_notif_body  := format('Your booking "%s" is awaiting admin approval.', p_title);
  END IF;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, action_url)
  VALUES (
    p_booked_by, p_org_id, v_notif_type, v_notif_title, v_notif_body, '/calendar'
  );

  INSERT INTO public.activity_log (org_id, actor_id, action, target_type, target_id, details)
  VALUES (
    p_org_id, p_booked_by, 'reservation.created', 'reservation', v_reservation_id,
    jsonb_build_object(
      'title',       p_title,
      'location_id', p_location_id,
      'start_time',  p_start_time,
      'end_time',    p_end_time,
      'status',      p_status
    )
  );

  RETURN v_reservation_id;
END;
$$;
