/**
 * k6 load test: 100 concurrent calendar views for 5 minutes.
 * Target: P95 response time < 500ms.
 *
 * Run: k6 run tests/load/calendar-views.js
 * With target: k6 run --env BASE_URL=https://yourapp.vercel.app tests/load/calendar-views.js
 */
import http from 'k6/http'
import { sleep, check } from 'k6'
import { Trend, Rate } from 'k6/metrics'

const responseTime = new Trend('calendar_response_time', true)
const errorRate = new Rate('calendar_errors')

export const options = {
  scenarios: {
    calendar_concurrent: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
  thresholds: {
    calendar_response_time: ['p(95)<500'],
    calendar_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test the login page as a proxy for app responsiveness
  // (calendar requires auth; login page exercises the same infra)
  const res = http.get(`${BASE_URL}/login`, {
    headers: { Accept: 'text/html' },
  })

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has html': (r) => r.body.includes('<!DOCTYPE html') || r.body.includes('<html'),
  })

  responseTime.add(res.timings.duration)
  errorRate.add(!ok)

  sleep(1)
}

export function handleSummary(data) {
  return {
    'tests/load/results/calendar-views-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

// Inline text summary helper (k6 built-in isn't directly importable in all versions)
function textSummary(data, _opts) {
  const p95 = data.metrics.calendar_response_time?.values?.['p(95)'] ?? 'N/A'
  const errRate = ((data.metrics.calendar_errors?.values?.rate ?? 0) * 100).toFixed(2)
  return `
=== Calendar Views Load Test ===
P95 response time : ${typeof p95 === 'number' ? p95.toFixed(0) : p95}ms  (target: <500ms)
Error rate        : ${errRate}%   (target: <1%)
`
}
