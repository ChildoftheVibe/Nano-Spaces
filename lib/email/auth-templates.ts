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

export function reservationFlaggedTemplate(
  roomName: string,
  reason: string,
  bookingTitle: string,
  startTime: string,
  endTime: string,
): string {
  const start = new Date(startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const end = new Date(endTime).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
  return layout(`
    <h2>Your booking requires attention</h2>
    <p>Your booking <strong>"${bookingTitle}"</strong> at <strong>${roomName}</strong> has been flagged and may no longer be valid.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Booking time:</strong> ${start} – ${end}</p>
    <p>Please contact your organization administrator to resolve this booking. Your reservation has been marked as flagged but not cancelled — no action has been taken to your time slot yet.</p>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View my bookings</a></p>
  `)
}

export function bookingConfirmationTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  endTime: string,
  isPending: boolean,
): string {
  const statusMsg = isPending
    ? '<p>Your booking is <strong>pending approval</strong> from an administrator. You will receive a follow-up email once it is reviewed.</p>'
    : '<p>Your booking is <strong>confirmed</strong>. See you there!</p>'
  return layout(`
    <h2>Booking ${isPending ? 'Received' : 'Confirmed'}</h2>
    <p>Hi ${userName},</p>
    ${statusMsg}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Title</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Start</td><td style="padding:8px 0">${startTime}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">End</td><td style="padding:8px 0">${endTime}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
  `)
}

export function bookingCancellationTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  cancelledByAdmin: boolean,
): string {
  const msg = cancelledByAdmin
    ? '<p>An administrator has cancelled your booking. Please contact your organization if you have questions.</p>'
    : '<p>Your booking has been successfully cancelled.</p>'
  return layout(`
    <h2>Booking Cancelled</h2>
    <p>Hi ${userName},</p>
    ${msg}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Title</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Date</td><td style="padding:8px 0">${startTime}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
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

export function waitlistAvailableTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  bookNowUrl: string,
): string {
  return layout(`
    <h2>Your Waitlist Spot is Available!</h2>
    <p>Hi ${userName},</p>
    <p>A slot has opened up for your waitlisted booking. You have <strong>30 minutes</strong> to confirm before it moves to the next person in line.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Booking</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Time</td><td style="padding:8px 0">${startTime}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${bookNowUrl}">Confirm Booking Now</a></p>
    <p style="color:#9CA3AF;font-size:13px">This offer expires in 30 minutes. If you do not confirm, your waitlist entry will be cancelled.</p>
  `)
}

export function approvalStatusTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  approved: boolean,
  reason?: string,
): string {
  const statusColor = approved ? '#059669' : '#DC2626'
  const statusText = approved ? 'Approved' : 'Rejected'
  const msg = approved
    ? '<p>Your booking has been <strong>approved</strong> and is now confirmed.</p>'
    : `<p>Your booking has been <strong>declined</strong>.${reason ? ` Reason: ${reason}` : ''}</p>`
  return layout(`
    <h2>Booking ${statusText}</h2>
    <p>Hi ${userName},</p>
    ${msg}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Status</td><td style="padding:8px 0;font-weight:600;color:${statusColor}">${statusText}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Booking</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Time</td><td style="padding:8px 0">${startTime}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
  `)
}

export function hibernationNoticeTemplate(userName: string, orgName: string): string {
  return layout(`
    <h2>Your account has been hibernated</h2>
    <p>Hi ${userName},</p>
    <p>Your Nano Spaces account in <strong>${orgName}</strong> has been automatically hibernated after 30 days of inactivity.</p>
    <p>Your data and any upcoming reservations are safe. Simply log in to reactivate your account.</p>
    <p style="text-align:center"><a class="btn" href="${BASE}/login">Log in to reactivate</a></p>
    <p>If you have questions, contact your organization administrator.</p>
  `)
}

export function ghostBusterReleaseTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
): string {
  return layout(`
    <h2>Your booking was released</h2>
    <p>Hi ${userName},</p>
    <p>Your booking was released because no check-in was detected within the required window after the booking start time.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Booking</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Start</td><td style="padding:8px 0">${startTime}</td></tr>
    </table>
    <p>The slot has been released for others to book. If you believe this was an error, please contact your administrator.</p>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
  `)
}

export function bookingReminderTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  endTime: string,
  window: '24h' | '1h',
): string {
  const windowLabel = window === '24h' ? '24 hours' : '1 hour'
  return layout(`
    <h2>Reminder: Your booking starts in ${windowLabel}</h2>
    <p>Hi ${userName},</p>
    <p>This is a reminder that your upcoming booking begins in <strong>${windowLabel}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Title</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Start</td><td style="padding:8px 0">${startTime}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">End</td><td style="padding:8px 0">${endTime}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
  `)
}

export function weeklyDigestTemplate(
  orgName: string,
  weekLabel: string,
  stats: {
    totalBookings: number
    cancellations: number
    noShows: number
    pendingApprovals: number
    newUsers: number
  },
): string {
  return layout(`
    <h2>Weekly Digest — ${orgName}</h2>
    <p>Here's a summary of activity for the week of <strong>${weekLabel}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
      <thead>
        <tr style="background:#EFF1F5">
          <th style="padding:10px 12px;text-align:left;font-weight:600;color:#1A1D23">Metric</th>
          <th style="padding:10px 12px;text-align:right;font-weight:600;color:#1A1D23">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:10px 12px;color:#4B5563">New bookings</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${stats.totalBookings}</td>
        </tr>
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:10px 12px;color:#4B5563">Cancellations</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${stats.cancellations}</td>
        </tr>
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:10px 12px;color:#4B5563">No-shows (ghost-released)</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${stats.noShows}</td>
        </tr>
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:10px 12px;color:#4B5563">Pending approvals</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${stats.pendingApprovals}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#4B5563">New users joined</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${stats.newUsers}</td>
        </tr>
      </tbody>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/org-admin/users">Manage your org</a></p>
  `)
}

export function recurringSeriesTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  created: number,
  skipped: number,
  firstStart: string,
): string {
  const skipNote =
    skipped > 0
      ? `<p><strong>${skipped} instance${skipped !== 1 ? 's' : ''}</strong> were skipped due to conflicts or unavailability.</p>`
      : ''
  return layout(`
    <h2>Recurring Booking Created</h2>
    <p>Hi ${userName},</p>
    <p>Your recurring booking series has been created with <strong>${created} instance${created !== 1 ? 's' : ''}</strong>.</p>
    ${skipNote}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Room</td><td style="padding:8px 0;font-weight:600">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Booking</td><td style="padding:8px 0">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">First date</td><td style="padding:8px 0">${firstStart}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Total</td><td style="padding:8px 0">${created} booking${created !== 1 ? 's' : ''}</td></tr>
    </table>
    <p style="text-align:center"><a class="btn" href="${BASE}/calendar">View Calendar</a></p>
  `)
}

export function godModeDisplacedTemplate(
  userName: string,
  bookingTitle: string,
  roomName: string,
  startTime: string,
  adminReason: string,
  bookNowUrl: string,
): string {
  return layout(`
    <h2>Your booking was cancelled by an administrator</h2>
    <p>Hi ${userName}, your reservation was cancelled to accommodate a priority booking.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:120px">Booking</td><td style="padding:8px 0;font-weight:600">${bookingTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Room</td><td style="padding:8px 0">${roomName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Time</td><td style="padding:8px 0">${startTime}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Reason</td><td style="padding:8px 0">${adminReason}</td></tr>
    </table>
    <p>You have been automatically added to the waitlist for this slot. If the priority booking is cancelled, you will be first in line.</p>
    <p style="text-align:center"><a class="btn" href="${bookNowUrl}">View Waitlist &amp; Rebook</a></p>
    <p style="font-size:13px;color:#9CA3AF">We apologise for the inconvenience. Please contact your administrator if you have questions.</p>
  `)
}

export function auditTamperAlertTemplate(orgName: string, detectedAt: string): string {
  return layout(`
    <h2 style="color:#DC2626">&#9888; Audit Log Tampering Detected</h2>
    <p>The hash chain verification for <strong>${orgName}</strong> has failed, indicating that one or more activity log entries may have been modified or deleted.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:8px 0;color:#6B7280;width:140px">Organisation</td><td style="padding:8px 0;font-weight:600">${orgName}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280">Detected at</td><td style="padding:8px 0">${detectedAt}</td></tr>
    </table>
    <p style="font-weight:600;color:#DC2626">Immediate action is recommended. Review the audit log for this organisation and investigate any recent database access.</p>
    <p style="text-align:center"><a class="btn" href="${BASE}/super-admin/god-mode-audit" style="background:#DC2626">View Audit Report</a></p>
  `)
}
