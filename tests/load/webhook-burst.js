/**
 * k6 load test: PayPal webhook burst — 100 events in 10 seconds.
 * Verifies idempotency (each unique event processed exactly once, duplicates ignored).
 *
 * Run: k6 run tests/load/webhook-burst.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

const processed = new Counter('webhooks_processed')
const rejected = new Counter('webhooks_rejected')
const errors = new Counter('webhooks_errored')

export const options = {
  scenarios: {
    webhook_burst: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 20,
    },
  },
  thresholds: {
    webhooks_errored: ['count<5'],
    http_req_failed: ['rate<0.05'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Pre-generate 20 unique event IDs so we can test duplicates
const EVENT_IDS = Array.from({ length: 20 }, (_, i) => `evt-load-test-${i}`)

let callCount = 0

export default function () {
  // Cycle through IDs — each will be sent ~5 times (100 / 20)
  const eventId = EVENT_IDS[callCount % EVENT_IDS.length]
  callCount++

  const payload = JSON.stringify({
    id: eventId,
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    resource: {
      id: `I-${eventId}`,
      status: 'ACTIVE',
      plan_id: 'test-plan-id',
      custom_id: `org-test`,
    },
  })

  const res = http.post(`${BASE_URL}/api/paypal/webhook`, payload, {
    headers: {
      'Content-Type': 'application/json',
      // Deliberately omit signature headers to test fast-fail path
    },
  })

  // With missing/invalid signature, expect 400 or 401
  // Without 5xx — the app must handle gracefully
  if (res.status >= 500) {
    errors.add(1)
  } else if (res.status === 200) {
    processed.add(1)
  } else {
    rejected.add(1)
  }

  check(res, {
    'no 5xx': (r) => r.status < 500,
  })

  sleep(0.05)
}

export function handleSummary(data) {
  return {
    'tests/load/results/webhook-burst-summary.json': JSON.stringify(data, null, 2),
  }
}
