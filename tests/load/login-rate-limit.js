/**
 * k6 load test: 1000 login attempts in 1 minute — rate limiter must hold.
 * Verifies Upstash rate limiting (10 per 15min per IP).
 *
 * Run: k6 run tests/load/login-rate-limit.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Rate } from 'k6/metrics'

const rateLimitedCount = new Counter('rate_limited_responses')
const unexpectedErrors = new Rate('unexpected_errors')

export const options = {
  scenarios: {
    login_burst: {
      executor: 'constant-arrival-rate',
      rate: 17, // ~1000 in 60s
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    // Rate limiter must kick in (expect many 429s — that's the desired behaviour)
    rate_limited_responses: ['count>10'],
    // No 5xx errors — the app must not crash under this load
    unexpected_errors: ['rate<0.02'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const CANDIDATES = [
  'attack1@evil.example',
  'attack2@evil.example',
  'attack3@evil.example',
  'admin@target.example',
  'root@target.example',
]

export default function () {
  const email = CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)]
  const payload = JSON.stringify({ email, password: `WrongPass${Math.random()}` })

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (res.status === 429) {
    rateLimitedCount.add(1)
  } else if (res.status >= 500) {
    unexpectedErrors.add(1)
  }

  check(res, {
    'no 5xx': (r) => r.status < 500,
    'either auth error or rate limited': (r) => r.status === 401 || r.status === 429,
  })

  sleep(0.05)
}

export function handleSummary(data) {
  return {
    'tests/load/results/login-rate-limit-summary.json': JSON.stringify(data, null, 2),
  }
}
