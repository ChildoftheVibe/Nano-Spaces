import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Nano Spaces',
  description:
    'The terms and conditions governing your use of Nano Spaces, operated by Nano Tech Productions.',
}

const VERSION = '1.0'
const EFFECTIVE_DATE = 'May 25, 2025'

export default function TermsPage() {
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
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
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
                d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z"
                clipRule="evenodd"
              />
            </svg>
            Version {VERSION} &middot; Effective {EFFECTIVE_DATE}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
          <p className="mt-3 text-base text-gray-500">
            Please read these terms carefully before using Nano Spaces.
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800 mb-10">
          <strong>Important:</strong> By using Nano Spaces, you agree to these Terms. If you are
          accepting on behalf of an organization, you represent that you have authority to bind that
          organization to these Terms.
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-700">
          {/* 1 */}
          <section id="parties">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Parties</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement
              between <strong>Nano Tech Productions</strong> (&ldquo;Company,&rdquo;
              &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) and you, the organization or
              individual accessing Nano Spaces (&ldquo;you&rdquo; or &ldquo;Customer&rdquo;). These
              Terms govern access to and use of the Nano Spaces workspace scheduling platform and
              all related services (&ldquo;Service&rdquo;).
            </p>
          </section>

          {/* 2 */}
          <section id="acceptance">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Acceptance of Terms</h2>
            <p>
              By creating an account, clicking &ldquo;I agree,&rdquo; accessing, or using the
              Service, you acknowledge that you have read, understood, and agree to be bound by
              these Terms and our{' '}
              <Link href="/privacy" className="text-[#FA5D0C] hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not access or use the Service.
            </p>
          </section>

          {/* 3 */}
          <section id="service">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Description of Service</h2>
            <p>
              Nano Spaces is a multi-tenant, cloud-based workspace scheduling platform that allows
              organizations to manage and book shared spaces, meeting rooms, and other resources.
              The Service is provided on a subscription basis. Features may vary by subscription
              tier.
            </p>
          </section>

          {/* 4 */}
          <section id="accounts">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Accounts &amp; Security</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                You must provide accurate, complete, and current information when creating an
                account.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of your account credentials.
                Mandatory two-factor authentication is required on all accounts.
              </li>
              <li>
                You must notify us immediately at{' '}
                <a href="mailto:security@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  security@nanospaces.app
                </a>{' '}
                upon becoming aware of any unauthorized access or breach.
              </li>
              <li>
                You may not share credentials, allow another person to access your account, or
                create accounts using automated means.
              </li>
              <li>
                Nano Tech Productions is not liable for any loss or damage arising from unauthorized
                use of your account.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section id="acceptable-use">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes. You must not:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Violate any applicable law, regulation, or third-party rights (including privacy,
                intellectual property, or export control laws).
              </li>
              <li>
                Attempt to probe, scan, or test the vulnerability of any system or network, or
                breach any security measures.
              </li>
              <li>
                Reverse-engineer, decompile, disassemble, or attempt to derive source code from the
                Service or any component thereof.
              </li>
              <li>
                Introduce malicious code, viruses, trojans, or other harmful software into the
                Service.
              </li>
              <li>
                Use the Service to send spam, unsolicited communications, or engage in phishing
                activity.
              </li>
              <li>
                Attempt to access data belonging to another organization or user, or circumvent
                access controls.
              </li>
              <li>
                Resell, sublicense, or otherwise commercialize access to the Service without our
                written consent.
              </li>
              <li>
                Use automated scripts, bots, or crawlers to access the Service in a manner that
                adversely impacts its performance or availability.
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate any account that violates this section,
              with or without prior notice.
            </p>
          </section>

          {/* 6 */}
          <section id="subscriptions">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              6. Subscriptions &amp; Billing
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Trial period:</strong> New organizations receive a 14-day free trial. No
                payment method is required to start a trial.
              </li>
              <li>
                <strong>Subscription:</strong> After the trial, continued access requires a paid
                subscription (Starter or Growth tier). Subscriptions are billed monthly via PayPal.
              </li>
              <li>
                <strong>Payment failure:</strong> If payment fails, your account enters a grace
                period. Access is restricted if payment is not received before the grace period
                ends.
              </li>
              <li>
                <strong>Cancellation:</strong> You may cancel your subscription at any time. Access
                continues until the end of the current billing period. No refunds are issued for
                partial periods.
              </li>
              <li>
                <strong>Price changes:</strong> We will provide at least 30 days&rsquo; notice of
                price changes via email.
              </li>
              <li>
                <strong>Taxes:</strong> Prices are exclusive of applicable taxes. You are
                responsible for all taxes associated with your use of the Service.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section id="org-admins">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              7. Organization Administrators
            </h2>
            <p>
              The organization administrator (&ldquo;org admin&rdquo;) who creates or manages an
              account is responsible for: (a) ensuring their organization&rsquo;s use of the Service
              complies with these Terms; (b) obtaining necessary consents from their users for data
              processing; (c) managing user access, roles, and permissions; and (d) the conduct of
              all users in their organization.
            </p>
          </section>

          {/* 8 */}
          <section id="data">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              8. Customer Data &amp; Privacy
            </h2>
            <p>
              You retain ownership of all data you submit to the Service (&ldquo;Customer
              Data&rdquo;). You grant Nano Tech Productions a limited, non-exclusive, royalty-free
              license to store, process, and transmit Customer Data solely to provide the Service.
              We will not access or use Customer Data except as necessary to operate the Service, as
              directed by you, or as required by law. Our use of personal data is governed by our{' '}
              <Link href="/privacy" className="text-[#FA5D0C] hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* 9 */}
          <section id="ip">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Intellectual Property</h2>
            <p>
              The Service, including all software, designs, trademarks, and content, is owned by
              Nano Tech Productions and protected by intellectual property laws. These Terms do not
              grant you any ownership interest in the Service. You may not copy, modify, distribute,
              sell, or lease any part of the Service without our prior written consent.
            </p>
          </section>

          {/* 10 */}
          <section id="confidentiality">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">10. Confidentiality</h2>
            <p>
              Each party may receive confidential information from the other. &ldquo;Confidential
              Information&rdquo; means any non-public information disclosed in connection with these
              Terms. Each party will: (a) protect the other&rsquo;s Confidential Information using
              at least the same care it uses for its own; (b) not disclose it to third parties
              without prior written consent; and (c) use it only to exercise rights or fulfill
              obligations under these Terms. These obligations do not apply to information that is
              or becomes publicly available through no breach of this section.
            </p>
          </section>

          {/* 11 */}
          <section id="availability">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">11. Service Availability</h2>
            <p>
              We strive for high availability but the Service is provided &ldquo;as is&rdquo; and
              &ldquo;as available&rdquo; without uptime guarantees unless a separate SLA has been
              agreed in writing. Planned maintenance will be communicated in advance where possible.
              We may modify, suspend, or discontinue any feature at any time with reasonable notice.
            </p>
          </section>

          {/* 12 */}
          <section id="disclaimers">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              12. Disclaimer of Warranties
            </h2>
            <p className="uppercase text-sm font-semibold text-gray-600 tracking-wide">
              To the fullest extent permitted by law:
            </p>
            <p className="mt-3">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL
              COMPONENTS. NANO TECH PRODUCTIONS DOES NOT WARRANT THAT DEFECTS WILL BE CORRECTED OR
              THAT THE SERVICE IS COMPATIBLE WITH YOUR EQUIPMENT OR SOFTWARE.
            </p>
          </section>

          {/* 13 */}
          <section id="liability">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              13. Limitation of Liability
            </h2>
            <p className="uppercase text-sm font-semibold text-gray-600 tracking-wide">
              Cap on damages:
            </p>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NANO TECH PRODUCTIONS&rsquo; TOTAL
              CUMULATIVE LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR
              THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID FOR THE SERVICE
              IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S.
              DOLLARS (USD $100).
            </p>
            <p className="mt-4 uppercase text-sm font-semibold text-gray-600 tracking-wide">
              Exclusion of consequential damages:
            </p>
            <p className="mt-3">
              IN NO EVENT SHALL NANO TECH PRODUCTIONS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS,
              REVENUE, DATA, GOODWILL, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY
              OF SUCH DAMAGES AND REGARDLESS OF THE THEORY OF LIABILITY.
            </p>
            <p className="mt-4 text-sm">
              Some jurisdictions do not allow the exclusion of certain warranties or limitation of
              certain damages. In such jurisdictions, our liability is limited to the minimum extent
              permitted by applicable law.
            </p>
          </section>

          {/* 14 */}
          <section id="indemnification">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">14. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Nano Tech Productions and its
              officers, directors, employees, and agents from any claim, demand, loss, liability,
              damages, costs, or expenses (including reasonable attorneys&rsquo; fees) arising from:
              (a) your use of the Service in violation of these Terms; (b) your Customer Data; (c)
              your violation of any law or third-party right; or (d) the conduct of your users.
            </p>
          </section>

          {/* 15 */}
          <section id="termination">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">15. Termination</h2>
            <p>
              Either party may terminate these Terms at any time. We may suspend or terminate your
              access immediately, without notice, for material breach of these Terms, failure to
              pay, or if we determine your use poses a security or legal risk. Upon termination, all
              licenses granted to you end and you must cease using the Service. Sections 9 (IP), 10
              (Confidentiality), 12 (Disclaimers), 13 (Limitation of Liability), 14
              (Indemnification), 16 (Governing Law), and 17 (Dispute Resolution) survive
              termination.
            </p>
          </section>

          {/* 16 */}
          <section id="governing-law">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">16. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict of law principles.
            </p>
          </section>

          {/* 17 */}
          <section id="disputes">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">17. Dispute Resolution</h2>
            <p>
              <strong>Informal resolution:</strong> Before initiating formal proceedings, both
              parties agree to attempt good-faith resolution by notifying the other at the contact
              addresses in these Terms and negotiating for 30 days.
            </p>
            <p className="mt-3">
              <strong>Arbitration:</strong> If informal resolution fails, disputes shall be resolved
              by binding arbitration under the rules of the American Arbitration Association (AAA)
              in Delaware. Each party bears its own costs unless the arbitrator determines
              otherwise. The arbitrator&rsquo;s decision is final and binding.
            </p>
            <p className="mt-3">
              <strong>Class action waiver:</strong> You waive any right to participate in a class
              action lawsuit or class-wide arbitration against Nano Tech Productions.
            </p>
            <p className="mt-3">
              <strong>Exceptions:</strong> Either party may seek emergency injunctive relief in any
              court of competent jurisdiction to prevent irreparable harm.
            </p>
          </section>

          {/* 18 */}
          <section id="force-majeure">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">18. Force Majeure</h2>
            <p>
              Neither party shall be liable for delays or failures in performance caused by
              circumstances beyond their reasonable control, including natural disasters, acts of
              government, power outages, internet disruptions, cyber-attacks by third parties, or
              pandemic conditions.
            </p>
          </section>

          {/* 19 */}
          <section id="general">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">19. General Provisions</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Entire agreement:</strong> These Terms, together with the Privacy Policy and
                any order forms or supplemental agreements, constitute the entire agreement between
                you and Nano Tech Productions.
              </li>
              <li>
                <strong>Severability:</strong> If any provision of these Terms is found
                unenforceable, it will be modified to the minimum extent necessary to make it
                enforceable, and the remaining provisions will continue in full force.
              </li>
              <li>
                <strong>No waiver:</strong> Our failure to enforce any right or provision does not
                constitute a waiver of that right.
              </li>
              <li>
                <strong>Assignment:</strong> You may not assign or transfer these Terms without our
                prior written consent. We may assign these Terms in connection with a merger,
                acquisition, or sale of assets.
              </li>
              <li>
                <strong>Notices:</strong> Legal notices to us must be sent to{' '}
                <a href="mailto:legal@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  legal@nanospaces.app
                </a>
                . We may send notices to you via the email address on your account.
              </li>
              <li>
                <strong>Updates:</strong> We may update these Terms from time to time. Continued use
                of the Service after the effective date of an update constitutes acceptance.
                Material changes will require re-acceptance in the Service.
              </li>
            </ul>
          </section>

          {/* 20 */}
          <section id="contact">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">20. Contact</h2>
            <div className="mt-4 rounded-lg border bg-gray-50 p-5 text-sm">
              <p>
                <strong>Nano Tech Productions</strong>
              </p>
              <p className="mt-1">
                Legal inquiries:{' '}
                <a href="mailto:legal@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  legal@nanospaces.app
                </a>
              </p>
              <p className="mt-1">
                Security issues:{' '}
                <a href="mailto:security@nanospaces.app" className="text-[#FA5D0C] hover:underline">
                  security@nanospaces.app
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
            <Link href="/privacy" className="text-[#FA5D0C] hover:underline">
              Privacy Policy
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
