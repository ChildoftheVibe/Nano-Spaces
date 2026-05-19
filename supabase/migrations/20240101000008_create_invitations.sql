-- Invitations — pending email invites to join an org
CREATE TABLE public.invitations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  role         text        NOT NULL DEFAULT 'user' CHECK (role IN ('user','org_admin')),
  token_hash   text        UNIQUE NOT NULL,
  expires_at   timestamptz NOT NULL,
  accepted     boolean     NOT NULL DEFAULT false,
  revoked      boolean     NOT NULL DEFAULT false,
  resend_count int         NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  invited_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
