import { env } from '@/lib/env'

const BASE = env.NEXT_PUBLIC_APP_URL
const BRAND = '#4F7EFA'

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { font-family: Inter, sans-serif; background: #F7F8FA; margin: 0; padding: 0; color: #1A1D23; }
  .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 16px rgba(0,0,0,.07); }
  h2 { font-family: 'Plus Jakarta Sans', sans-serif; color: #1A1D23; margin: 0 0 16px; }
  p { line-height: 1.6; margin: 0 0 16px; color: #4B5563; }
  .btn { display: inline-block; padding: 12px 24px; background: ${BRAND}; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
  .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${BRAND}; text-align: center; padding: 24px; background: #EEF3FF; border-radius: 8px; margin: 24px 0; }
  .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #9CA3AF; }
</style></head><body>
<div class="wrap">
  <h2>🗓 Nano Spaces</h2>
  ${content}
  <div class="footer">This email was sent by Nano Spaces. If you did not expect this, you can safely ignore it.</div>
</div></body></html>`
}

export function otpEmailTemplate(code: string, purposeLabel: string): string {
  return layout(`
    <h2>Your ${purposeLabel} code</h2>
    <p>Use this code to complete your sign-in. It expires in <strong>10 minutes</strong> and can only be used once.</p>
    <div class="code">${code}</div>
    <p>If you did not request this code, please contact your administrator immediately.</p>
  `)
}

export function passwordResetTemplate(resetUrl: string): string {
  return layout(`
    <h2>Reset your password</h2>
    <p>Click the button below to choose a new password. This link expires in <strong>60 minutes</strong>.</p>
    <p style="text-align:center"><a class="btn" href="${resetUrl}">Reset Password</a></p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `)
}

export function emailChangeNewTemplate(verifyUrl: string, newEmail: string): string {
  return layout(`
    <h2>Confirm your new email</h2>
    <p>You requested an email change to <strong>${newEmail}</strong>.</p>
    <p>Click below to confirm. This link expires in <strong>24 hours</strong>.</p>
    <p style="text-align:center"><a class="btn" href="${verifyUrl}">Confirm New Email</a></p>
  `)
}

export function emailChangeOldTemplate(newEmail: string): string {
  return layout(`
    <h2>Your email address was changed</h2>
    <p>Your Nano Spaces email was updated to <strong>${newEmail}</strong>.</p>
    <p><strong>If you did not make this change</strong>, contact your administrator immediately or visit <a href="${BASE}/forgot-password">reset your password</a>.</p>
  `)
}

export function accountDeletionRequestAdminTemplate(
  userName: string,
  userEmail: string,
  orgName: string,
): string {
  return layout(`
    <h2>Account deletion requested</h2>
    <p>A user in your organization has requested account deletion:</p>
    <p><strong>${userName}</strong> (${userEmail}) — <em>${orgName}</em></p>
    <p>Their data will be removed within 30 days unless you take action. Log in to the admin panel to review or cancel this request.</p>
  `)
}

export function invitationEmailTemplate(
  inviterName: string,
  orgName: string,
  role: string,
  acceptUrl: string,
): string {
  const roleLabel = role === 'org_admin' ? 'Administrator' : 'Member'
  return layout(`
    <h2>You've been invited to ${orgName}</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Nano Spaces as a <strong>${roleLabel}</strong>.</p>
    <p>Click the button below to accept your invitation and set up your account. This link expires in <strong>48 hours</strong>.</p>
    <p style="text-align:center"><a class="btn" href="${acceptUrl}">Accept Invitation</a></p>
    <p>If you did not expect this invitation, you can safely ignore this email.</p>
  `)
}

export function announcementEmailTemplate(
  orgName: string,
  message: string,
  signature?: string | null,
): string {
  const sig = signature
    ? `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #E5E7EB;white-space:pre-wrap;color:#4B5563">${signature}</p>`
    : ''
  return layout(`
    <h2>Message from ${orgName}</h2>
    <p style="white-space:pre-wrap">${message}</p>
    ${sig}
  `)
}

export function trialReminderTemplate(daysLeft: number, upgradeUrl: string): string {
  const urgency =
    daysLeft <= 1 ? 'ends tomorrow' : `ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  return layout(`
    <h2>Your free trial ${urgency}</h2>
    <p>Your 14-day Nano Spaces trial ${urgency}. Subscribe now to keep uninterrupted access to your spaces and reservations.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0">
      <tr>
        <td style="padding:16px;border:1px solid #E5E7EB;border-radius:8px 0 0 8px;vertical-align:top">
          <strong style="color:#1A1D23">Starter — $45/mo</strong>
          <p style="margin:8px 0 0;font-size:13px">5 rooms · 1 admin · 100 users</p>
        </td>
        <td style="padding:16px;border:1px solid #4F7EFA;border-radius:0 8px 8px 0;background:#EEF3FF;vertical-align:top">
          <strong style="color:#4F7EFA">Growth — $65/mo</strong>
          <p style="margin:8px 0 0;font-size:13px">20 rooms · 3 admins · unlimited users</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${upgradeUrl}">Subscribe now</a></p>
    <p>If you have any questions, reply to this email or contact <a href="mailto:support@nanospaces.app">support@nanospaces.app</a>.</p>
  `)
}

export function trialExpiredTemplate(upgradeUrl: string): string {
  return layout(`
    <h2>Your free trial has ended</h2>
    <p>Your 14-day Nano Spaces trial has expired. To restore access for your team, subscribe to a plan.</p>
    <p>Your data and reservations are safe — subscribe within 30 days and everything will be exactly as you left it.</p>
    <p style="text-align:center"><a class="btn" href="${upgradeUrl}">Choose a plan</a></p>
    <p>Questions? Contact us at <a href="mailto:support@nanospaces.app">support@nanospaces.app</a>.</p>
  `)
}

export function subscriptionReminderTemplate(
  daysLeft: number,
  tier: string,
  renewalDate: string,
  billingUrl: string,
): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)
  return layout(`
    <h2>Your subscription renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h2>
    <p>Your Nano Spaces <strong>${tierLabel} Plan</strong> renews on <strong>${renewalDate}</strong>.</p>
    <p>No action is needed — your subscription will renew automatically via PayPal.</p>
    <p>To manage your subscription, visit your billing settings:</p>
    <p style="text-align:center"><a class="btn" href="${billingUrl}">Billing settings</a></p>
  `)
}

export function gracePeriodTemplate(graceEndsDate: string, billingUrl: string): string {
  return layout(`
    <h2>Your subscription has been cancelled</h2>
    <p>Your Nano Spaces subscription has been cancelled. You have a <strong>5-day grace period</strong> — your team retains full access until <strong>${graceEndsDate}</strong>.</p>
    <p>To resubscribe and keep uninterrupted access, click below:</p>
    <p style="text-align:center"><a class="btn" href="${billingUrl}">Resubscribe</a></p>
    <p>After ${graceEndsDate}, your team will be redirected to the subscription page. Your data and reservations will be preserved.</p>
  `)
}

export function accountLockoutAdminTemplate(
  userName: string,
  userEmail: string,
  orgName: string,
): string {
  return layout(`
    <h2>Account locked — action may be required</h2>
    <p>The account for <strong>${userName}</strong> (${userEmail}) in your organization <strong>${orgName}</strong> has been locked after 10 consecutive failed login attempts.</p>
    <p>The account will automatically unlock after 24 hours, or an administrator can manually unlock it from the user management panel.</p>
  `)
}
