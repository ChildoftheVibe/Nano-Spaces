-- ─────────────────────────────────────────────────────────────────────────────
-- organizations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.organizations
  FOR ALL
  USING (id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.organizations
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.profiles
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.profiles
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- locations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.locations
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.locations
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- availability_rules — joins through locations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.availability_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_id AND l.org_id = public.auth_org_id()
    )
  );

CREATE POLICY super_admin_all ON public.availability_rules
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- blackout_dates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.blackout_dates
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.blackout_dates
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- reservations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.reservations
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.reservations
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- invitations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.invitations
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.invitations
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications — only the recipient sees their own
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY own_notifications ON public.notifications
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY org_admin_read ON public.notifications
  FOR SELECT
  USING (
    org_id = public.auth_org_id()
    AND public.auth_role() IN ('org_admin')
  );

CREATE POLICY super_admin_all ON public.notifications
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- push_subscriptions — only the owner can manage their own subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY own_subscriptions ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY super_admin_all ON public.push_subscriptions
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_isolation ON public.invoices
  FOR ALL
  USING (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.invoices
  FOR ALL
  USING (public.auth_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- activity_log — append-only for org members; super_admin can do anything
-- Non-super_admin roles: SELECT and INSERT only — no UPDATE or DELETE policy
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY org_read ON public.activity_log
  FOR SELECT
  USING (org_id = public.auth_org_id());

CREATE POLICY org_insert ON public.activity_log
  FOR INSERT
  WITH CHECK (org_id = public.auth_org_id());

CREATE POLICY super_admin_all ON public.activity_log
  FOR ALL
  USING (public.auth_role() = 'super_admin');
