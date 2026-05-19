-- Organizations — top-level tenant entity
CREATE TABLE public.organizations (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text        NOT NULL,
  -- slug is UNIQUE and immutable (enforced by trigger below)
  slug                      text        UNIQUE NOT NULL,
  display_name              text        NOT NULL,
  logo_url                  text,
  subscription_status       text        NOT NULL DEFAULT 'trial'
                              CHECK (subscription_status IN ('trial','active','inactive','expired','grace')),
  subscription_tier         text        NOT NULL DEFAULT 'starter'
                              CHECK (subscription_tier IN ('starter','growth')),
  tier_room_limit           int         NOT NULL DEFAULT 5,
  tier_admin_limit          int         NOT NULL DEFAULT 1,
  tier_user_limit           int         DEFAULT 100, -- NULL = unlimited
  trial_starts_at           timestamptz NOT NULL DEFAULT now(),
  trial_ends_at             timestamptz NOT NULL DEFAULT now() + interval '14 days',
  paypal_subscription_id    text,
  paypal_plan_id            text,
  subscription_expires_at   timestamptz,
  grace_period_ends_at      timestamptz,
  master_admin_email_optin  boolean     NOT NULL DEFAULT false,
  primary_timezone          text        NOT NULL DEFAULT 'America/New_York',
  tos_version_accepted      text        REFERENCES public.tos_versions(version) ON DELETE SET NULL,
  tos_accepted_at           timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- Prevent slug updates after creation
CREATE OR REPLACE FUNCTION public.prevent_slug_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug <> OLD.slug THEN
    RAISE EXCEPTION 'Organization slug is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_slug_immutability
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.prevent_slug_update();
