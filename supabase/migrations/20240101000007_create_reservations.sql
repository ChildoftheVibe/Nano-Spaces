-- Reservations — core booking record
-- recurring_group_id: no FK, just a grouping UUID for a recurring series
-- Multiple profile FKs use SET NULL so reservations survive user deletion
CREATE TABLE public.reservations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id         uuid        REFERENCES public.locations(id) ON DELETE CASCADE,
  booked_by           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_id              uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title               text        NOT NULL,
  notes               text,
  start_time          timestamptz NOT NULL,
  end_time            timestamptz NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','cancelled','flagged','released')),
  recurring_group_id  uuid,
  checked_in          boolean     NOT NULL DEFAULT false,
  checked_in_at       timestamptz,
  god_mode_override   boolean     NOT NULL DEFAULT false,
  god_mode_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  god_mode_reason     text,
  original_booker_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reminder_sent       boolean     NOT NULL DEFAULT false,
  reminder_1h_sent    boolean     NOT NULL DEFAULT false,
  cancelled_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at        timestamptz,
  cancellation_reason text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
