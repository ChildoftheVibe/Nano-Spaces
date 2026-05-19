-- TOS versions lookup table — no FKs, created first
CREATE TABLE public.tos_versions (
  version          text        PRIMARY KEY,
  content_url      text        NOT NULL,
  effective_at     timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
