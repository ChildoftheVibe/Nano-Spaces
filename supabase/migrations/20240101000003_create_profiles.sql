-- Profiles — one-to-one with auth.users, belongs to an organization
-- org_id is nullable for super_admin users who span all orgs
CREATE TABLE public.profiles (
  id                       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id                   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  role                     text        NOT NULL CHECK (role IN ('super_admin','org_admin','user')),
  full_name                text        NOT NULL DEFAULT '',
  email                    text        NOT NULL,
  pending_email            text,
  email_change_token_hash  text,
  email_change_expires_at  timestamptz,
  timezone                 text        NOT NULL DEFAULT 'America/New_York',
  is_active                boolean     NOT NULL DEFAULT true,
  hibernate_status         text        NOT NULL DEFAULT 'active'
                             CHECK (hibernate_status IN ('active','hibernated')),
  last_active_at           timestamptz,
  hibernated_at            timestamptz,
  auto_wake_token          text,
  email_reminders          boolean     NOT NULL DEFAULT false,
  reminder_timing          text        CHECK (reminder_timing IN ('24h','1h','both')),
  totp_enabled             boolean     NOT NULL DEFAULT false,
  totp_reset_requested     boolean     NOT NULL DEFAULT false,
  two_fa_method            text        NOT NULL DEFAULT 'totp'
                             CHECK (two_fa_method IN ('totp','email_otp')),
  failed_login_attempts    int         NOT NULL DEFAULT 0,
  locked_until             timestamptz,
  tos_accepted_at          timestamptz,
  tos_version_accepted     text        REFERENCES public.tos_versions(version) ON DELETE SET NULL,
  -- Self-referential FK: who invited this user
  invited_by               uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);
