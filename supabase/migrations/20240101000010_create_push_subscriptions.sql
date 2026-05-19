-- Push subscriptions — Web Push (VAPID) device registrations
CREATE TABLE public.push_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  p256dh     text        NOT NULL,
  auth_key   text        NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
