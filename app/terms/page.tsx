import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Nano Spaces',
}

export default function TermsPage() {
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
            Version 1.0 &middot; Effective January 1, 2024
          </p>
          <h1 className="font-heading mt-2 text-4xl font-bold text-[var(--text-primary)]">
            Terms of Service
          </h1>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3">
              By accessing or using Nano Spaces (&ldquo;the Service&rdquo;), you agree to be bound
              by these Terms of Service and all applicable laws and regulations. If you do not agree
              with any part of these terms, you may not access the Service. These terms apply to all
              users, including organization administrators and regular users.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              2. Use of the Service
            </h2>
            <p className="mt-3">
              Nano Spaces provides a multi-tenant workspace scheduling platform. You may use the
              Service only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Engage in any activity that violates applicable law or regulation.</li>
              <li>
                Attempt to gain unauthorized access to any part of the Service or other users&rsquo;
                accounts.
              </li>
              <li>Share your credentials or allow another person to use your account.</li>
              <li>Use the Service to transmit harmful, defamatory, or fraudulent content.</li>
              <li>
                Reverse-engineer, decompile, or attempt to extract source code from the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              3. Accounts and Security
            </h2>
            <p className="mt-3">
              You are responsible for maintaining the security of your account credentials.
              Two-factor authentication is required for all accounts. You must notify us immediately
              upon becoming aware of any breach of security or unauthorized use of your account.
              Nano Spaces is not liable for losses caused by unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              4. Data and Privacy
            </h2>
            <p className="mt-3">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-[var(--brand-primary)] hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms. Your organization&rsquo;s data is isolated
              using row-level security enforced at the database level. We will not share your data
              with other organizations or use it to train AI models.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              5. Organization Administrators
            </h2>
            <p className="mt-3">
              Organization administrators (&ldquo;org admins&rdquo;) are responsible for managing
              users, configuring spaces, and ensuring that their organization&rsquo;s use of the
              Service complies with these Terms. Org admins may add, remove, and modify user access.
              They have access to activity logs and may view reservations made within their
              organization.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              6. Subscriptions and Billing
            </h2>
            <p className="mt-3">
              Nano Spaces offers paid subscription plans (Starter and Growth). Subscriptions are
              billed on a recurring basis. If payment fails, your organization will enter a grace
              period. If payment is not received within the grace period, access to the Service will
              be restricted. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              7. Service Availability
            </h2>
            <p className="mt-3">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We strive
              for high availability but do not guarantee uninterrupted or error-free access. Nano
              Spaces may experience downtime for maintenance, updates, or circumstances beyond our
              control. We will endeavor to provide advance notice of scheduled maintenance.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              8. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by applicable law, Nano Spaces and its affiliates
              shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Service. Our total liability to you for any
              claims arising under these Terms shall not exceed the amount you paid for the Service
              in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              9. Changes to Terms
            </h2>
            <p className="mt-3">
              We may update these Terms from time to time. When we do, we will update the version
              number and effective date at the top of this page. For material changes, we will
              notify users and require re-acceptance before continued use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              10. Contact
            </h2>
            <p className="mt-3">
              If you have any questions about these Terms, please contact us at{' '}
              <a
                href="mailto:legal@nanospaces.app"
                className="text-[var(--brand-primary)] hover:underline"
              >
                legal@nanospaces.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6 text-sm text-gray-500">
          <Link href="/privacy" className="text-[var(--brand-primary)] hover:underline">
            Privacy Policy
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
