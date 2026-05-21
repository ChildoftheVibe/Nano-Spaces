# Disaster Recovery Plan

---

## Recovery Objectives

| Metric                             | Target                            |
| ---------------------------------- | --------------------------------- |
| **RTO** (Recovery Time Objective)  | < 4 hours for P0 (full restore)   |
| **RPO** (Recovery Point Objective) | < 24 hours (daily backup cadence) |

---

## Backup Strategy

### Database (Supabase Postgres)

- **Automated:** Supabase takes daily point-in-time backups retained for 7 days (Pro plan) or 30 days (Team plan)
- **Manual exports:** run weekly via Supabase CLI: `supabase db dump -f backup-$(date +%Y%m%d).sql`
- **Storage location:** Supabase manages backup storage; optionally export to S3 for offsite retention

### Storage Buckets (Supabase Storage)

| Bucket      | Contents           | Backup Strategy                                            |
| ----------- | ------------------ | ---------------------------------------------------------- |
| `org-logos` | Organisation logos | Supabase managed; export monthly via storage API if needed |
| `invoices`  | PDF invoices       | Download monthly archive via signed URL batch script       |

### Application Code

- **Primary:** GitHub `main` branch is the source of truth
- **Redundancy:** Vercel maintains all previous deployment artifacts; any past deploy can be reactivated instantly

### Environment Variables

- **Primary:** Vercel dashboard (encrypted at rest)
- **Backup:** Store a copy in a team password manager (e.g. 1Password) — update on every rotation

---

## Restore Procedures

### Scenario 1: Bad Deployment (Most Common)

1. Open Vercel dashboard → Deployments
2. Click the last known good deployment
3. Click **Instant Rollback**
4. Verify `/api/health` returns 200 and smoke tests pass
5. **RTO:** < 5 minutes

### Scenario 2: Database Corruption / Accidental Data Loss

1. Identify the point in time before corruption occurred
2. Supabase Dashboard → Settings → Backups → Point-in-Time Recovery
3. Select restore point and target (staging first to verify)
4. Verify data integrity on staging
5. Promote to production or restore production directly
6. **RTO:** 1–4 hours depending on database size
7. **RPO:** up to 24 hours (or near-zero with PITR on Pro plan)

### Scenario 3: Supabase Region Outage

1. Check Supabase status page: https://status.supabase.com
2. If extended outage (> 1 hour): put app in maintenance mode via Vercel environment variable `MAINTENANCE_MODE=true` (add middleware guard)
3. Export latest backup when service restores
4. Verify full service recovery before removing maintenance mode
5. **RTO:** depends on Supabase SLA (typically < 4 hours)

### Scenario 4: Complete Account Loss (Nuclear)

1. Create new Supabase project
2. Restore schema: `supabase db push` from `supabase/migrations/`
3. Restore data: `psql $NEW_DB_URL < latest-backup.sql`
4. Re-upload storage assets from local backups
5. Update all Supabase env vars in Vercel to new project credentials
6. Re-run `supabase gen types typescript --local > types/supabase.ts` and redeploy
7. Reconfigure auth providers, SMTP, storage policies
8. **RTO:** 4–8 hours

### Scenario 5: Vercel Account Loss

1. Clone repo to new Vercel account
2. Re-add all environment variables from password manager backup
3. Re-link custom domain DNS
4. **RTO:** 1–2 hours

---

## Runbooks

### Check System Health

```bash
# Health endpoint
curl https://nano-spaces.vercel.app/api/health | jq .

# Check DB directly (requires local Supabase CLI + project linked)
supabase db query "SELECT count(*) FROM organizations"

# Check cron job last run (via activity_log)
supabase db query "SELECT action, created_at FROM activity_log ORDER BY created_at DESC LIMIT 20"
```

### Export Database Backup

```bash
# Full schema + data dump
supabase db dump --linked -f backup-$(date +%Y%m%d).sql

# Data only (safer for restores into existing schema)
supabase db dump --linked --data-only -f data-$(date +%Y%m%d).sql
```

### Restore to Staging

```bash
# Apply migrations to a clean Supabase project
supabase db push --db-url $STAGING_DB_URL

# Restore data
psql $STAGING_DB_URL < backup-YYYYMMDD.sql
```

---

## Disaster Recovery Testing

Test the full restore procedure quarterly:

1. Spin up a new Supabase project (staging)
2. Run `supabase db push` to apply all migrations
3. Restore a recent data backup
4. Deploy the app pointing at the staging DB
5. Verify all features work end-to-end
6. Tear down the staging project
7. Document the test in this file with date and outcome

**Last tested:** —
**Next scheduled test:** —

---

## Data Retention Policy (aligned with `data-retention-purge` cron)

| Data                       | Retention                                       |
| -------------------------- | ----------------------------------------------- |
| Cancelled reservations     | 2 years                                         |
| Activity log entries       | 1 year                                          |
| Processed webhooks         | 90 days                                         |
| Push subscriptions (stale) | Deleted on next push delivery failure (410/404) |
| Notifications              | 30 days                                         |
| Invoices (PDFs in storage) | 7 years (legal requirement)                     |
