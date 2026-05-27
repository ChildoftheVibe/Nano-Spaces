-- Fix multi-tenant silo violations in notifications and profiles.

-- 1. Notifications: org_admin_read allowed org admins to SELECT every user's personal
--    notification messages (booking confirmations, cancellations, etc.). This crosses
--    user-level privacy silos. The own_notifications (user_id = auth.uid()) policy is
--    sufficient for legitimate use; super_admin_all covers super admin needs.
DROP POLICY IF EXISTS "org_admin_read" ON public.notifications;

-- 2. Profiles: the blanket org_isolation (ALL) policy let any authenticated org member
--    read every column of every peer's profile row, including security-sensitive columns:
--    totp_secret, failed_login_attempts, locked_until, auto_wake_token,
--    email_change_token_hash, email_change_expires_at.
--    Replace with two narrower policies:
--      a) own_row_all             — users have full CRUD on their own row only
--      b) org_admin_read_profiles — org/super admins can SELECT org members' profiles
--         (required for user-management UI and invitation flows)
DROP POLICY IF EXISTS "org_isolation" ON public.profiles;

CREATE POLICY "own_row_all"
  ON public.profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "org_admin_read_profiles"
  ON public.profiles FOR SELECT
  USING (
    org_id = auth_org_id()
    AND auth_role() IN ('org_admin', 'super_admin')
  );
