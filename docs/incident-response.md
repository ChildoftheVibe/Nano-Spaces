# Incident Response Playbook

---

## Severity Levels

| Level             | Description                                       | Response Time        | Examples                                                                         |
| ----------------- | ------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| **P0 — Critical** | Complete service outage or active data breach     | Immediate (< 15 min) | Database down, all logins failing, data exfiltration suspected                   |
| **P1 — High**     | Core feature unavailable, significant user impact | < 1 hour             | Booking creation failing for all users, email delivery stopped, payment failures |
| **P2 — Medium**   | Degraded performance or partial feature failure   | < 4 hours            | Slow calendar load, push notifications not sending, reports timing out           |
| **P3 — Low**      | Minor issue, workaround available                 | Next business day    | Cosmetic bug, single user affected, non-critical feature broken                  |

---

## On-Call Responsibilities

- **Primary:** check Sentry alerts, Vercel status, Supabase status dashboard
- **Health endpoint:** `GET /api/health` — returns `status: healthy/degraded` with per-service detail
- **Alert channels:** Sentry email alerts, Vercel deployment notifications, Upstash Redis alerts

---

## Incident Response Steps

### 1. Detect

- Sentry fires an alert for error spike or new exception
- Smoke tests fail post-deploy (`.github/workflows/smoke.yml`)
- `/api/health` returns `503 degraded`
- User report via support channel

### 2. Triage

- Check `/api/health` for which service is degraded
- Check Sentry for error volume and stack trace
- Check Vercel deployment logs for recent changes
- Check Supabase dashboard for DB CPU/connections
- Check Upstash for Redis saturation

### 3. Communicate (P0/P1 only)

Post to #incidents Slack channel within 15 minutes:

```
🚨 [INCIDENT STARTED] P{level} — {brief description}
Impact: {what users cannot do}
Started: {time}
Investigating: {who}
```

Update every 30 minutes until resolved.

### 4. Mitigate

Common mitigations:

| Issue                            | Mitigation                                          |
| -------------------------------- | --------------------------------------------------- |
| Bad deploy broke the app         | Vercel → Deployments → Instant Rollback to previous |
| DB connection saturation         | Scale Supabase compute up temporarily               |
| Redis rate-limit loop            | Rate limiting fails open — monitor for abuse        |
| Resend quota exhausted           | Upgrade Resend plan or disable non-critical emails  |
| PayPal webhook delivery failures | Re-queue via PayPal developer console               |

### 5. Resolve

- Deploy fix or confirm rollback is stable
- Verify `/api/health` returns 200
- Verify smoke tests pass
- Post resolution message:

```
✅ [INCIDENT RESOLVED] P{level} — {brief description}
Resolved: {time}
Duration: {duration}
Root cause: {one sentence}
```

### 6. Post-Mortem (P0/P1)

Complete within 48 hours. Template:

```markdown
## Incident Post-Mortem — {date} — {title}

### Summary

One paragraph: what happened, who was affected, for how long.

### Timeline (UTC)

- HH:MM — Event
- HH:MM — Detection
- HH:MM — Mitigation applied
- HH:MM — Resolved

### Root Cause

Technical explanation of what went wrong.

### Contributing Factors

- Factor 1
- Factor 2

### What Went Well

- ...

### Action Items

| Action | Owner | Due |
| ------ | ----- | --- |
| ...    | ...   | ... |
```

---

## Communication Templates

### Status Page Update (degraded)

> We are currently investigating an issue affecting [feature]. Our team is working to restore full service. We will provide updates every 30 minutes.

### Status Page Update (resolved)

> The issue affecting [feature] has been resolved as of [time UTC]. We apologize for the inconvenience and will share a full post-mortem within 48 hours.

### User-facing email (P0 only, > 1hr outage)

Subject: `[Nano Spaces] Service Disruption — {date}`

> We experienced a service disruption from {start} to {end} UTC affecting {description}. Your data is safe. We apologize for the interruption and have taken steps to prevent recurrence.

---

## Escalation Contacts

| Role                     | Contact              | When to escalate                    |
| ------------------------ | -------------------- | ----------------------------------- |
| Engineering Lead         | —                    | P0 after 30 min without mitigation  |
| Supabase Support         | support.supabase.com | Database issues not self-resolvable |
| Vercel Support           | vercel.com/support   | Infrastructure issues               |
| PayPal Developer Support | developer.paypal.com | Billing/webhook issues              |
