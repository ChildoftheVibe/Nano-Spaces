-- Availability rules — weekly open/close windows per location
-- day_of_week: 0=Sunday … 6=Saturday (multiple days per rule allowed)
CREATE TABLE public.availability_rules (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id    uuid    NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week    int[]   NOT NULL,
  open_time      time    NOT NULL,
  close_time     time    NOT NULL,
  block_holidays boolean NOT NULL DEFAULT false
);
