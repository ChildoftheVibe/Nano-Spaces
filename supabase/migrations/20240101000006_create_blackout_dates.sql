-- Blackout dates — org-wide or per-location blocks
-- location_id is nullable for org-wide blackouts
CREATE TABLE public.blackout_dates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  uuid        REFERENCES public.locations(id) ON DELETE CASCADE,
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  start_time   timestamptz NOT NULL,
  end_time     timestamptz NOT NULL,
  is_recurring boolean     NOT NULL DEFAULT false,
  recur_rule   text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
