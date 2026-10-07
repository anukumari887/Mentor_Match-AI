const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/User');
const { generateIcsCalendar } = require('../utils/calendar');

const isSecure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : env.SMTP_PORT === 465;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: isSecure,
  ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {})
});

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatIST(date) {
  if (!date) return '';
  const d = new Date(date);
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d) + ' IST'
  );
}

function formatRupeesFromPaise(paise) {
  const rs = Math.round((Number(paise) || 0) / 100);
  return `₹${new Intl.NumberFormat('en-IN').format(rs)}`;
}

async function sendEmail({ to, subject, text, html, attachments }) {
  if (!to) return;
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      attachments
    });
    logger.info({ to, subject, messageId: info?.messageId }, 'Email notification sent successfully');
    return info;
  } catch (error) {
    logger.error({ to, subject, err: error.message }, 'Could not send email notification');
  }
}

// 1. Verification Email
async function sendVerificationEmail(user, token) {
  const safeName = escapeHtml(user.name || 'there');
  const verifyUrl = `${env.PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your email';
  const text = `Mentor-Match\n\nHello ${user.name || 'there'},\n\nPlease verify your email address to unlock booking, payments, and messaging on Mentor-Match:\n\n${verifyUrl}\n\nThis verification link is valid for 24 hours.\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">Please verify your email address to activate your account and start booking mentorship sessions.</p>
      <div style="margin-bottom: 24px;">
        <a href="${verifyUrl}" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Verify email address
        </a>
      </div>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">
        Or open this link in your browser:<br />
        <span style="word-break: break-all; color: #0f766e;">${verifyUrl}</span>
      </p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        This link expires in 24 hours. If you did not create a Mentor-Match account, you can safely ignore this email.
      </p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, text, html });
}

// 2. Chat Message Notification Email
async function sendChatMessageEmail({ recipient, senderName, conversationId, messageText }) {
  const safeSender = escapeHtml(senderName || 'a user');
  const safeRecipient = escapeHtml(recipient?.name || 'there');
  const preview = (messageText || '').slice(0, 100);
  const safeSnippet = escapeHtml(preview);
  const messagesUrl = `${env.PUBLIC_APP_URL}/messages/${conversationId}`;
  const subject = `New message from ${senderName || 'a user'}`;
  const text = `Mentor-Match\n\nHello ${recipient?.name || 'there'},\n\nNew message from ${senderName}:\n"${preview}"\n\nReply here: ${messagesUrl}\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeRecipient},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">You have a new message from <strong>${safeSender}</strong>:</p>
      <div style="background-color: #f3f4f6; border-left: 3px solid #0f766e; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #374151; white-space: pre-wrap;">${safeSnippet}</div>
      <div style="margin-bottom: 24px;">
        <a href="${messagesUrl}" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Open conversation
        </a>
      </div>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: recipient?.email, subject, text, html });
}

// 3. Refund Pending Email (to Learner)
async function sendRefundPendingEmail({ learner, booking, payment }) {
  const safeName = escapeHtml(learner?.name || 'there');
  const formattedDate = formatIST(booking?.startTime);
  const amountStr = formatRupeesFromPaise(payment?.amount);
  const subject = 'Refund pending for your Mentor-Match session';
  const text = `Mentor-Match\n\nHello ${learner?.name || 'there'},\n\nA refund of ${amountStr} for your session scheduled on ${formattedDate} is being processed.\n\nWe will update you once the refund has been completed.\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">
        Your refund of <strong>${escapeHtml(amountStr)}</strong> for the session scheduled on <strong>${escapeHtml(formattedDate)}</strong> is being processed.
      </p>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
        Our team has queued this refund and no further action is required from you.
      </p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: learner?.email, subject, text, html });
}

// 4. Refund Completed Email (to Learner)
async function sendRefundCompletedEmail({ learner, booking, payment }) {
  const safeName = escapeHtml(learner?.name || 'there');
  const formattedDate = formatIST(booking?.startTime);
  const amountStr = formatRupeesFromPaise(payment?.amount);
  const safeRef = escapeHtml(payment?.refundReference || '');
  const subject = 'Your Mentor-Match refund is complete';
  const text = `Mentor-Match\n\nHello ${learner?.name || 'there'},\n\nYour refund of ${amountStr} for the session scheduled on ${formattedDate} has been processed.${safeRef ? ` Reference: ${safeRef}.` : ''}\n\nPlease note: it can take several working days to reach your account.\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">
        Your refund of <strong>${escapeHtml(amountStr)}</strong> for the session on <strong>${escapeHtml(formattedDate)}</strong> has been completed.
      </p>
      ${safeRef ? `<p style="font-size: 14px; color: #374151; margin-bottom: 16px;">Refund reference: <strong>${safeRef}</strong></p>` : ''}
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
        It can take several working days to reach your account.
      </p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: learner?.email, subject, text, html });
}

// 5. Booking Confirmation Emails (with calendar .ics attachment)
async function sendBookingConfirmation(booking) {
  const learnerId = booking.learnerId?._id || booking.learnerId;
  const mentorId = booking.mentorId?._id || booking.mentorId;
  const [learner, mentor] = await Promise.all([
    User.findById(learnerId).select('name email').lean(),
    User.findById(mentorId).select('name email').lean()
  ]);

  const timeFormatted = formatIST(booking.startTime);
  const bookingId = String(booking._id);
  const sessionUrl = `${env.PUBLIC_APP_URL}/session/${bookingId}`;
  const calendarUrl = `${env.PUBLIC_APP_URL}/api/bookings/${bookingId}/calendar.ics`;

  const learnerIcs = generateIcsCalendar({ booking, otherPersonName: mentor?.name || 'Mentor' });
  const mentorIcs = generateIcsCalendar({ booking, otherPersonName: learner?.name || 'Learner' });

  const buildHtml = (userName, otherName, _icsLink) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${escapeHtml(userName)},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">Your 1-to-1 mentorship session with <strong>${escapeHtml(otherName)}</strong> is confirmed.</p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Session Time:</strong> ${escapeHtml(timeFormatted)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> 60 minutes</p>
        <p style="margin: 0;"><strong>Booking Reference:</strong> ${escapeHtml(bookingId)}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <a href="${sessionUrl}" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Join session room
        </a>
      </div>
      <p style="font-size: 13px; color: #4b5563; margin-bottom: 16px;">
        <a href="${calendarUrl}" style="color: #0f766e; text-decoration: underline;">Add to calendar (.ics)</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        You can check your camera and microphone in <a href="${env.PUBLIC_APP_URL}/settings" style="color: #0f766e;">Settings</a> before the call starts.
      </p>
    </div>
  `;

  await Promise.all([
    sendEmail({
      to: learner?.email,
      subject: 'Your Mentor-Match session is confirmed',
      text: `Hello ${learner?.name || 'there'},\n\nYour session with ${mentor?.name || 'your mentor'} is confirmed for ${timeFormatted}.\nDuration: 60 minutes\nJoin room: ${sessionUrl}\nAdd to calendar: ${calendarUrl}\n\nYou can check your camera and microphone in Settings.`,
      html: buildHtml(learner?.name || 'there', mentor?.name || 'your mentor', calendarUrl),
      attachments: [{ filename: `session-${bookingId}.ics`, content: learnerIcs, contentType: 'text/calendar; charset=utf-8' }]
    }),
    sendEmail({
      to: mentor?.email,
      subject: 'Your Mentor-Match session is confirmed',
      text: `Hello ${mentor?.name || 'there'},\n\nYour session with ${learner?.name || 'your learner'} is confirmed for ${timeFormatted}.\nDuration: 60 minutes\nJoin room: ${sessionUrl}\nAdd to calendar: ${calendarUrl}\n\nYou can check your camera and microphone in Settings.`,
      html: buildHtml(mentor?.name || 'there', learner?.name || 'your learner', calendarUrl),
      attachments: [{ filename: `session-${bookingId}.ics`, content: mentorIcs, contentType: 'text/calendar; charset=utf-8' }]
    })
  ]);
}

// 6. Booking Cancellation Email
function sendBookingCancellation(booking, recipientId) {
  const timeFormatted = formatIST(booking.startTime);
  return User.findById(recipientId)
    .select('name email')
    .lean()
    .then((recipient) =>
      sendEmail({
        to: recipient?.email,
        subject: 'A Mentor-Match session was cancelled',
        text: `Hello ${recipient?.name || 'there'},\n\nA session scheduled for ${timeFormatted} was cancelled.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
            <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
              Mentor-Match
            </div>
            <p style="font-size: 15px; margin-bottom: 16px;">Hello ${escapeHtml(recipient?.name || 'there')},</p>
            <p style="font-size: 15px; margin-bottom: 16px;">A session scheduled for <strong>${escapeHtml(timeFormatted)}</strong> was cancelled.</p>
            <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Mentor-Match Technical Mentorship Platform
            </p>
          </div>
        `
      })
    );
}

// 7. Session Reminder Email (PART 4)
async function sendSessionReminder(booking, recipient, otherUserName, hoursAhead = 1) {
  const safeRecipientName = escapeHtml(recipient?.name || 'there');
  const safeOtherName = escapeHtml(otherUserName || 'your peer');
  const timeFormatted = formatIST(booking.startTime);
  const bookingId = String(booking._id);
  const sessionUrl = `${env.PUBLIC_APP_URL}/session/${bookingId}`;
  const calendarUrl = `${env.PUBLIC_APP_URL}/api/bookings/${bookingId}/calendar.ics`;
  const settingsUrl = `${env.PUBLIC_APP_URL}/settings`;

  const subject =
    hoursAhead === 24
      ? `Reminder: Your session with ${otherUserName || 'your peer'} is tomorrow`
      : `Your Mentor-Match session starts soon`;

  const text = `Mentor-Match\n\nHello ${recipient?.name || 'there'},\n\nYour session with ${otherUserName || 'your peer'} is scheduled for ${timeFormatted}.\nLength: 60 minutes\n\nJoin room: ${sessionUrl}\nYou can check your camera and microphone in Settings: ${settingsUrl}\nAdd to calendar: ${calendarUrl}\n`;

  const icsContent = generateIcsCalendar({ booking, otherPersonName: otherUserName });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeRecipientName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">
        ${hoursAhead === 24 ? 'This is a reminder that your session' : 'Your session'} with <strong>${safeOtherName}</strong> is scheduled for <strong>${escapeHtml(timeFormatted)}</strong>.
      </p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 14px;">
        <p style="margin: 0 0 6px 0;"><strong>Date & Time:</strong> ${escapeHtml(timeFormatted)}</p>
        <p style="margin: 0;"><strong>Length:</strong> 60 minutes</p>
      </div>
      <div style="margin-bottom: 20px;">
        <a href="${sessionUrl}" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Join session room
        </a>
      </div>
      <p style="font-size: 14px; color: #374151; margin-bottom: 14px;">
        You can check your camera and microphone in <a href="${settingsUrl}" style="color: #0f766e; text-decoration: underline;">Settings</a>.
      </p>
      <p style="font-size: 13px; color: #4b5563; margin-bottom: 16px;">
        <a href="${calendarUrl}" style="color: #0f766e; text-decoration: underline;">Add to calendar (.ics)</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;

  return sendEmail({
    to: recipient?.email,
    subject,
    text,
    html,
    attachments: [{ filename: `session-${bookingId}.ics`, content: icsContent, contentType: 'text/calendar; charset=utf-8' }]
  });
}

// 8. Review Request Email
function sendReviewRequest(booking, learner) {
  const safeName = escapeHtml(learner?.name || 'there');
  const subject = 'How was your Mentor-Match session?';
  const text = `Mentor-Match\n\nHello ${learner?.name || 'there'},\n\nYour session is complete. Sign in to leave a review. Booking reference: ${booking._id}.\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">Your mentorship session is complete. Please share your feedback to help the community.</p>
      <div style="margin-bottom: 24px;">
        <a href="${env.PUBLIC_APP_URL}/sessions" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Leave a review
        </a>
      </div>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: learner?.email, subject, text, html });
}

// 9. Password Changed Email
async function sendPasswordChangedEmail(user) {
  const safeName = escapeHtml(user.name || 'there');
  const forgotUrl = `${env.PUBLIC_APP_URL}/forgot-password`;
  const subject = 'Your Mentor-Match password was changed';
  const text = `Mentor-Match\n\nHello ${user.name || 'there'},\n\nYour password was changed. All other sessions have been signed out.\n\nIf this was not you, reset your password now: ${forgotUrl}\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">Your account password was recently changed. All other active logins have been signed out.</p>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">If this was not you, reset your password now:</p>
      <div style="margin-bottom: 24px;">
        <a href="${forgotUrl}" style="background-color: #c2593f; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Reset your password
        </a>
      </div>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, text, html });
}

// 10. Password Reset Email
async function sendPasswordResetEmail(user, token) {
  const safeName = escapeHtml(user.name || 'there');
  const resetUrl = `${env.PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your Mentor-Match password';
  const text = `Mentor-Match\n\nHello ${user.name || 'there'},\n\nWe received a request to reset your password. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello ${safeName},</p>
      <p style="font-size: 15px; margin-bottom: 16px;">We received a request to reset the password for your Mentor-Match account. This link will expire in 30 minutes.</p>
      <div style="margin-bottom: 24px;">
        <a href="${resetUrl}" style="background-color: #c2593f; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Set new password
        </a>
      </div>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">
        Or copy and paste this link into your browser:<br />
        <span style="word-break: break-all; color: #c2593f;">${resetUrl}</span>
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 24px;">If you did not request this password reset, no action is needed and your account remains secure.</p>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Technical Mentorship Platform
      </p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, text, html });
}

// 11. Admin Mentor Review Notification
async function sendAdminMentorReviewEmail(mentorUser) {
  const safeName = escapeHtml(mentorUser?.name || 'A mentor');
  const subject = `Mentor profile ready for review: ${mentorUser?.name || 'New mentor'}`;
  const reviewUrl = `${env.PUBLIC_APP_URL}/admin/mentors`;
  const text = `Mentor-Match Admin\n\nMentor ${mentorUser?.name} has completed their profile and verified their email address.\n\nReview profile: ${reviewUrl}\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
        Mentor-Match Admin
      </div>
      <p style="font-size: 15px; margin-bottom: 16px;">Hello Admin,</p>
      <p style="font-size: 15px; margin-bottom: 16px;">Mentor <strong>${safeName}</strong> has completed their profile and verified their email. Their profile is ready for review.</p>
      <div style="margin-bottom: 20px;">
        <a href="${reviewUrl}" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Open admin review queue
        </a>
      </div>
      <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Mentor-Match Platform Administration
      </p>
    </div>
  `;
  return sendEmail({ to: env.ADMIN_EMAIL, subject, text, html });
}

module.exports = {
  escapeHtml,
  formatIST,
  sendVerificationEmail,
  sendChatMessageEmail,
  sendRefundPendingEmail,
  sendRefundCompletedEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendSessionReminder,
  sendReviewRequest,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendAdminMentorReviewEmail
};