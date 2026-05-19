-- Notifications — in-app bell notifications per user
CREATE TABLE public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL,
  body       text        NOT NULL,
  read       boolean     NOT NULL DEFAULT false,
  read_at    timestamptz,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
