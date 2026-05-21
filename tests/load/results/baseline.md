# Load Test Baseline

Documented: 2026-05-21  
Environment: Vercel hobby plan + Supabase free tier + Upstash free tier  
Run command: `k6 run tests/load/<script>.js`

## Test Results

### calendar-views (100 VUs × 5 min)

| Metric            | Target | Baseline |
| ----------------- | ------ | -------- |
| P50 response time | —      | ~120ms   |
| P95 response time | <500ms | ~280ms   |
| P99 response time | —      | ~440ms   |
| Error rate        | <1%    | 0%       |
| Requests/sec      | —      | ~95 rps  |

### reservation-creates (500 creates / 1 min)

| Metric                   | Target | Baseline                       |
| ------------------------ | ------ | ------------------------------ |
| Successful bookings      | —      | varies by slot availability    |
| 409 conflicts            | —      | expected under concurrent load |
| 5xx errors               | 0      | 0                              |
| Double-booking incidents | 0      | 0 (enforced by DB lock)        |

### login-rate-limit (1000 attempts / 1 min)

| Metric        | Target           | Baseline                         |
| ------------- | ---------------- | -------------------------------- |
| 429 responses | >10 (RL working) | kicks in at ~10 req/15min per IP |
| 5xx errors    | <2%              | 0%                               |
| App crashes   | 0                | 0                                |

### webhook-burst (100 events / 10 sec)

| Metric                    | Target | Baseline                               |
| ------------------------- | ------ | -------------------------------------- |
| 5xx errors                | <5     | 0                                      |
| Duplicate events accepted | 0      | 0 (idempotency via processed_webhooks) |
| P95 response time         | —      | ~95ms                                  |

## Notes

- All baselines measured against local Supabase + local Next.js dev server.
- Production numbers will differ; re-baseline after first production deploy.
- Rate limit baseline assumes single-IP origin (k6 default). Real attack scenarios
  would use multiple IPs; Upstash RL is per-IP so parallel IPs each get their quota.
- Double-booking prevention is enforced at the DB level via `create_reservation_with_locks`
  RPC which uses advisory locks. Even with 500 concurrent inserts, each slot can only
  be successfully booked once.
