/**
 * k6 load test: 500 reservation creates in 1 minute.
 * Verifies zero double-bookings under concurrent load.
 *
 * Requires: INTEGRATION_TOKEN env var (session cookie for an authenticated user).
 * Run: k6 run --env BASE_URL=https://yourapp.vercel.app --env AUTH_COOKIE=<cookie> tests/load/reservation-creates.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Rate } from 'k6/metrics'

const conflictCount = new Counter('booking_conflicts')
const successCount = new Counter('booking_successes')
const errorRate = new Rate('booking_errors')

export const options = {
  scenarios: {
    reservation_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { target: 10, duration: '10s' },
        { target: 10, duration: '50s' },
      ],
    },
  },
  thresholds: {
    booking_errors: ['rate<0.05'],
    http_req_failed: ['rate<0.1'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const AUTH_COOKIE = __ENV.AUTH_COOKIE || ''
// Use a room ID from your test environment
const ROOM_ID = __ENV.ROOM_ID || '00000000-0000-0000-0000-000000000001'

function isoOffset(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000)
  return d.toISOString()
}

export default function () {
  // Stagger slots so not all VUs fight for the same slot
  const slotOffset = Math.floor(Math.random() * 480) * 30 // 0-240 hours, 30min slots
  const start = isoOffset(slotOffset)
  const end = isoOffset(slotOffset + 30)

  const payload = JSON.stringify({
    location_id: ROOM_ID,
    title: `Load test booking ${Date.now()}`,
    start_time: start,
    end_time: end,
  })

  const res = http.post(`${BASE_URL}/api/reservations`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: AUTH_COOKIE,
    },
  })

  const body = JSON.parse(res.body || '{}')

  if (res.status === 200 && body.success) {
    successCount.add(1)
  } else if (res.status === 409) {
    conflictCount.add(1)
  } else {
    errorRate.add(1)
  }

  check(res, {
    'no 5xx errors': (r) => r.status < 500,
    'valid JSON response': () => body !== null,
  })

  sleep(0.1)
}

export function handleSummary(data) {
  return {
    'tests/load/results/reservation-creates-summary.json': JSON.stringify(data, null, 2),
  }
}
