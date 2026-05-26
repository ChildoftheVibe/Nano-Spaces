import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Nano Spaces',
  description:
    'How Nano Tech Productions collects, uses, and protects your personal data when you use Nano Spaces.',
}

const LAST_UPDATED = 'May 25, 2025'
const EFFECTIVE_DATE = 'May 25, 2025'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-gray-900 hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FA5D0C]">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" />
              </svg>
            </div>
            <span className="font-bold">Nano Spaces</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-900">
              Terms
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#FA5D0C] px-4 py-1.5 text-white hover:bg-[#3b6ef8]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        {/* Title block */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#FA5D0C]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1zm3 8V5.5a3 3 0 1 0-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            Last updated {LAST_UPDATED}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-3 text-base text-gray-500">Effective {EFFECTIVE_DATE}</p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800 mb-10">
          <strong>Summary:</strong> We collect only what we need to run Nano Spaces. We never sell
          your data. Your organization&rsquo;s data is strictly isolated from other tenants. You can
          export or delete your data at any time.
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-700">
          {/* 1 */}
          <section id="controller">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Data Controller</h2>
            <p>
              Nano Spaces is operated by <strong>Nano Tech Productions</strong> (&ldquo;we,&rdquo;
              &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We are the data controller for personal data
              processed through the Nano Spaces platform. For privacy inquiries, contact us at{' '}
              <a href="mailto:privacy@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                privacy@nanospaces.app
              </a>
              .
            </p>
          </section>

          {/* 2 */}
          <section id="data-collected">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Data We Collect</h2>
            <p>We collect only the data necessary to operate the Service:</p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Category</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Examples</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  <tr>
                    <td className="px-4 py-3 font-medium">Account data</td>
                    <td className="px-4 py-3">Name, work email, role, organization</td>
                    <td className="px-4 py-3">Identity &amp; access control</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Authentication data</td>
                    <td className="px-4 py-3">Hashed password, 2FA config, session tokens</td>
                    <td className="px-4 py-3">Security &amp; account protection</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Booking data</td>
                    <td className="px-4 py-3">Reservations, check-ins, cancellations</td>
                    <td className="px-4 py-3">Core service functionality</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Usage &amp; audit data</td>
                    <td className="px-4 py-3">Activity logs, IP address, browser type</td>
                    <td className="px-4 py-3">Security, fraud prevention, compliance</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Preferences</td>
                    <td className="px-4 py-3">Timezone, notification settings</td>
                    <td className="px-4 py-3">Personalized experience</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Billing data</td>
                    <td className="px-4 py-3">Subscription plan, payment status</td>
                    <td className="px-4 py-3">Billing &amp; invoicing (via PayPal)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">OAuth profile data</td>
                    <td className="px-4 py-3">
                      Name, profile photo from Google / LinkedIn / Slack
                    </td>
                    <td className="px-4 py-3">Account creation via social login</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We do <strong>not</strong> collect: government IDs, sensitive health data, financial
              account numbers, or precise geolocation. Passwords are hashed and are never stored in
              recoverable form.
            </p>
          </section>

          {/* 3 */}
          <section id="lawful-basis">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              3. Lawful Basis for Processing
            </h2>
            <p>
              Where the GDPR or similar regulations apply, we process your personal data on the
              following legal bases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Contract performance:</strong> Processing necessary to provide the Nano
                Spaces service under your organization&rsquo;s subscription agreement.
              </li>
              <li>
                <strong>Legitimate interests:</strong> Security monitoring, fraud prevention, audit
                logging, and improving the Service — where these interests are not overridden by
                your rights.
              </li>
              <li>
                <strong>Legal obligation:</strong> Retention of billing records and compliance with
                applicable law.
              </li>
              <li>
                <strong>Consent:</strong> Marketing emails and push notifications, where you have
                explicitly opted in. You may withdraw consent at any time.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section id="how-we-use">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">4. How We Use Your Data</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provision and operation of the Nano Spaces platform.</li>
              <li>Authentication, two-factor verification, and session management.</li>
              <li>
                Transactional notifications: booking confirmations, reminders, security alerts.
              </li>
              <li>Billing, invoicing, and subscription management via PayPal.</li>
              <li>Security monitoring, account lockout enforcement, and abuse prevention.</li>
              <li>Aggregate, anonymized analytics to improve the Service.</li>
              <li>
                Legal compliance: responding to lawful requests from public authorities, courts, or
                regulators.
              </li>
            </ul>
            <p className="mt-4">
              <strong>We do not</strong> use your data to train AI or machine-learning models. We do
              not sell, rent, or trade your personal data to third parties for their own marketing
              purposes.
            </p>
          </section>

          {/* 5 */}
          <section id="data-processors">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              5. Sub-processors &amp; Third Parties
            </h2>
            <p>
              The following sub-processors handle personal data on our behalf under data processing
              agreements that include standard contractual clauses where applicable:
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Provider</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  <tr>
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3">Database, authentication, file storage, real-time</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3">Application hosting, edge compute, CDN</td>
                    <td className="px-4 py-3">Global (primary: US)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Resend</td>
                    <td className="px-4 py-3">Transactional email delivery</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">PayPal</td>
                    <td className="px-4 py-3">Subscription billing and payment processing</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Upstash</td>
                    <td className="px-4 py-3">Rate limiting (ephemeral, no PII stored)</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Cloudflare Turnstile</td>
                    <td className="px-4 py-3">Bot protection on login forms</td>
                    <td className="px-4 py-3">Global CDN</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Sentry</td>
                    <td className="px-4 py-3">
                      Error monitoring (email and full name stripped before transmission)
                    </td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Google / LinkedIn / Slack</td>
                    <td className="px-4 py-3">
                      OAuth identity verification (optional; only when you choose social login)
                    </td>
                    <td className="px-4 py-3">Global</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 6 */}
          <section id="multi-tenancy">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              6. Multi-Tenancy &amp; Data Isolation
            </h2>
            <p>
              Every record in Nano Spaces is scoped to an organization. Row-Level Security (RLS)
              policies are enforced at the Postgres database layer — not just in application code —
              ensuring that no user, query, or API call can access another organization&rsquo;s
              data. Supabase anon-key clients operate under RLS at all times; only our service-role
              key bypasses RLS, and it is never exposed to the browser or end-user.
            </p>
          </section>

          {/* 7 */}
          <section id="security">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Security Measures</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Encryption in transit:</strong> All connections use TLS 1.2 or higher.
              </li>
              <li>
                <strong>Encryption at rest:</strong> Database and storage volumes are encrypted by
                Supabase.
              </li>
              <li>
                <strong>Mandatory 2FA:</strong> All users must enroll in two-factor authentication
                (TOTP or email OTP) before accessing the Service.
              </li>
              <li>
                <strong>Password protection:</strong> Passwords are hashed with bcrypt and checked
                against the HaveIBeenPwned breach database at signup and reset.
              </li>
              <li>
                <strong>Account lockout:</strong> Progressive lockout after failed login attempts.
              </li>
              <li>
                <strong>Audit chain:</strong> All admin actions are logged with a tamper-evident
                SHA-256 hash chain.
              </li>
              <li>
                <strong>Strict CSP:</strong> A per-request Content Security Policy nonce prevents
                cross-site scripting.
              </li>
            </ul>
            <p className="mt-4">
              We will notify affected users and, where legally required, relevant regulators within
              72 hours of discovering a confirmed personal data breach.
            </p>
          </section>

          {/* 8 */}
          <section id="cookies">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Cookies</h2>
            <p>We use a minimal set of cookies — all strictly necessary:</p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Cookie</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Lifetime</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">sb-*</td>
                    <td className="px-4 py-3">Supabase authentication session</td>
                    <td className="px-4 py-3">Session / 1 hour (refreshed)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">ns_2fa</td>
                    <td className="px-4 py-3">Two-factor verification state (HMAC-signed)</td>
                    <td className="px-4 py-3">8 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
            </p>
          </section>

          {/* 9 */}
          <section id="retention">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Data Retention</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Active accounts:</strong> Personal data is retained for as long as your
                account is active.
              </li>
              <li>
                <strong>Deleted accounts:</strong> Personal data is removed within 30 days of
                deletion, except where retention is required by law.
              </li>
              <li>
                <strong>Billing records:</strong> Retained for 7 years for tax and legal compliance.
              </li>
              <li>
                <strong>Audit logs:</strong> Retained for 2 years for security and compliance
                purposes.
              </li>
              <li>
                <strong>Breach / security incident records:</strong> Retained for 5 years.
              </li>
            </ul>
          </section>

          {/* 10 */}
          <section id="your-rights">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">10. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the following rights. To exercise any of
              them, contact{' '}
              <a href="mailto:privacy@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                privacy@nanospaces.app
              </a>
              .
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Right</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">How to exercise</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  <tr>
                    <td className="px-4 py-3 font-medium">Access &amp; portability</td>
                    <td className="px-4 py-3">
                      Export your data (CSV/ZIP) from Settings → Account
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Correction</td>
                    <td className="px-4 py-3">Update your profile in Settings at any time</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Erasure</td>
                    <td className="px-4 py-3">
                      Request deletion from Settings → Account, or email us
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Restrict / object to processing</td>
                    <td className="px-4 py-3">
                      Email{' '}
                      <a
                        href="mailto:privacy@nanospaces.app"
                        className="text-[#FA5D0C] hover:underline"
                      >
                        privacy@nanospaces.app
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Withdraw consent</td>
                    <td className="px-4 py-3">
                      Unsubscribe from emails in Settings → Notifications, or email us
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Lodge a complaint</td>
                    <td className="px-4 py-3">
                      Contact your local data protection authority (EU/UK users)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We will respond to all rights requests within 30 days. In complex cases, we may extend
              this by a further 60 days with notice.
            </p>
          </section>

          {/* 11 */}
          <section id="california">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              11. California Residents (CCPA / CPRA)
            </h2>
            <p>
              California residents have additional rights under the CCPA and CPRA. We do not sell or
              share personal information as defined under California law. You have the right to know
              what personal information we collect, to delete it, to correct it, and to opt out of
              any sale (there is none). To exercise these rights, contact{' '}
              <a href="mailto:privacy@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                privacy@nanospaces.app
              </a>
              . We will not discriminate against you for exercising any of these rights.
            </p>
          </section>

          {/* 12 */}
          <section id="international">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              12. International Data Transfers
            </h2>
            <p>
              Nano Tech Productions is based in the United States. If you are located in the
              European Economic Area (EEA), the United Kingdom, or Switzerland, your personal data
              may be transferred to and processed in the United States and other countries. We rely
              on Standard Contractual Clauses (SCCs) and equivalent mechanisms approved by relevant
              data protection authorities to provide appropriate safeguards for these transfers.
            </p>
          </section>

          {/* 13 */}
          <section id="children">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              13. Children&rsquo;s Privacy
            </h2>
            <p>
              Nano Spaces is a B2B workplace platform and is not directed to individuals under 16
              years of age. We do not knowingly collect personal data from children. If we become
              aware that we have inadvertently received personal data from a child, we will delete
              it promptly.
            </p>
          </section>

          {/* 14 */}
          <section id="changes">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Material changes will be communicated
              via email and an in-app notification at least 14 days before they take effect. The
              &ldquo;Last updated&rdquo; date at the top of this page will always reflect when the
              most recent revision was made.
            </p>
          </section>

          {/* 15 */}
          <section id="contact">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">15. Contact Us</h2>
            <p>
              For privacy questions, rights requests, or to report a concern, contact Nano Tech
              Productions at:
            </p>
            <div className="mt-4 rounded-lg border bg-gray-50 p-5 text-sm">
              <p>
                <strong>Nano Tech Productions</strong>
              </p>
              <p className="mt-1">
                Privacy inquiries:{' '}
                <a href="mailto:privacy@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  privacy@nanospaces.app
                </a>
              </p>
              <p className="mt-1">
                General support:{' '}
                <a href="mailto:support@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  support@nanospaces.app
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-14 flex items-center justify-between border-t pt-6 text-sm text-gray-400">
          <div className="flex gap-4">
            <Link href="/terms" className="text-[#FA5D0C] hover:underline">
              Terms of Service
            </Link>
            <span>&middot;</span>
            <Link href="/login" className="hover:text-gray-600">
              Sign in
            </Link>
          </div>
          <span>&copy; {new Date().getFullYear()} Nano Tech Productions</span>
        </div>
      </main>
    </div>
  )
}
