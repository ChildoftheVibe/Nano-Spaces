-- Phase 3 auth additions
-- TOTP secret stored encrypted (AES-256-GCM via app layer)
ALTER TABLE public.profiles
  ADD COLUMN totp_secret text;

-- IP-based login failure tracking lives in Redis (ephemeral).
-- This table tracks per-account lockout state already in profiles.

-- Email OTP codes — server-side only (service role), no RLS user policies
CREATE TABLE public.email_otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash   text        NOT NULL, -- SHA-256(code)
  purpose     text        NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'enrollment')),
  is_used     boolean     NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;
-- No user-facing policies: all access goes through service role in API routes

CREATE INDEX idx_email_otp_user ON public.email_otp_codes (user_id, purpose, is_used, expires_at);
