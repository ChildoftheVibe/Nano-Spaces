import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Nano Spaces',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="border-b bg-white px-6 py-4">
        <Link href="/" className="font-heading text-xl font-bold text-[var(--text-primary)]">
          Nano Spaces
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-medium text-[var(--brand-primary)]">
            Effective January 1, 2024
          </p>
          <h1 className="font-heading mt-2 text-4xl font-bold text-[var(--text-primary)]">
            Privacy Policy
          </h1>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              1. Introduction
            </h2>
            <p className="mt-3">
              Nano Spaces (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
              protecting your personal information. This Privacy Policy explains how we collect,
              use, store, and share your data when you use our workspace scheduling platform. By
              using Nano Spaces, you agree to the practices described in this Policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              2. Information We Collect
            </h2>
            <p className="mt-3">We collect the following categories of information:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>
                <strong>Account information:</strong> name, email address, role, and organization
                membership.
              </li>
              <li>
                <strong>Authentication data:</strong> hashed passwords, two-factor authentication
                method and configuration.
              </li>
              <li>
                <strong>Usage data:</strong> booking history, check-ins, and activity logs within
                your organization.
              </li>
              <li>
                <strong>Device data:</strong> browser type, IP address, and session identifiers for
                security and fraud prevention.
              </li>
              <li>
                <strong>Preferences:</strong> timezone, notification settings, and email
                preferences.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              3. How We Use Your Information
            </h2>
            <p className="mt-3">We use your information to:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Provide, operate, and improve the Nano Spaces platform.</li>
              <li>Authenticate your identity and enforce security policies.</li>
              <li>
                Send transactional emails (booking confirmations, reminders, account notifications).
              </li>
              <li>Generate billing and invoicing for subscription plans.</li>
              <li>Detect and prevent fraud, abuse, and security incidents.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              4. No-Sale Policy
            </h2>
            <p className="mt-3">
              <strong>We do not sell your personal data.</strong> We do not rent, trade, or sell
              your personal information to third parties for their marketing purposes. Your data is
              used solely to operate and improve the Nano Spaces service for you and your
              organization.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              5. Data Processors
            </h2>
            <p className="mt-3">
              We use the following third-party service providers to operate Nano Spaces. Each acts
              as a data processor under our instructions and is bound by data processing agreements:
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Provider</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3">Database, authentication, and file storage</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3">Application hosting and edge compute</td>
                    <td className="px-4 py-3">Global CDN</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Resend</td>
                    <td className="px-4 py-3">Transactional email delivery</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">PayPal</td>
                    <td className="px-4 py-3">Payment processing and subscription billing</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              6. Data Isolation and Security
            </h2>
            <p className="mt-3">
              All organizational data is isolated using row-level security (RLS) enforced at the
              database level. Users can only access data belonging to their own organization. We use
              industry-standard encryption in transit (TLS 1.2+) and at rest.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              7. Your Rights
            </h2>
            <p className="mt-3">
              Depending on your location, you may have the following rights regarding your personal
              data:
            </p>
            <ul className="mt-3 list-disc space-y-3 pl-6">
              <li>
                <strong>Export:</strong> Download a copy of all personal data we hold about you,
                including your profile, booking history, and activity log. Available from your{' '}
                <Link href="/settings" className="text-[var(--brand-primary)] hover:underline">
                  Account Settings
                </Link>
                .
              </li>
              <li>
                <strong>Correction:</strong> Update your name, email address, timezone, and other
                profile information at any time from your{' '}
                <Link href="/settings" className="text-[var(--brand-primary)] hover:underline">
                  Account Settings
                </Link>
                .
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and associated data.
                Submit a deletion request from your{' '}
                <Link href="/settings" className="text-[var(--brand-primary)] hover:underline">
                  Account Settings
                </Link>
                . Your data will be removed within 30 days. Note that your organization
                administrator must approve the deletion.
              </li>
              <li>
                <strong>Object:</strong> Object to certain types of processing, including marketing
                communications, at any time from your account settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              8. Data Retention
            </h2>
            <p className="mt-3">
              We retain your personal data for as long as your account is active or as needed to
              provide the Service. Upon account deletion, your personal data is removed within 30
              days, except where retention is required by law (e.g., billing records for tax
              purposes).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              9. Cookies and Tracking
            </h2>
            <p className="mt-3">
              Nano Spaces uses a minimal number of cookies: a session cookie for authentication and
              a short-lived two-factor authentication verification cookie. We do not use advertising
              trackers, third-party analytics cookies, or fingerprinting technologies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              10. Changes to This Policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy periodically. We will notify you of material changes
              via email and will update the effective date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              11. Contact
            </h2>
            <p className="mt-3">
              For privacy-related questions or to exercise your rights, contact us at{' '}
              <a
                href="mailto:privacy@nanospaces.app"
                className="text-[var(--brand-primary)] hover:underline"
              >
                privacy@nanospaces.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6 text-sm text-gray-500">
          <Link href="/terms" className="text-[var(--brand-primary)] hover:underline">
            Terms of Service
          </Link>
          {' · '}
          <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
