const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
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

async function sendEmail({ to, subject, text, html }) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    logger.warn({ message: error.message }, 'Could not send email; continuing without error');
  }
}

async function sendBookingEmails(booking, subject, message) {
  const learnerId = booking.learnerId?._id || booking.learnerId;
  const mentorId = booking.mentorId?._id || booking.mentorId;
  const [learner, mentor] = await Promise.all([
    User.findById(learnerId).select('name email').lean(),
    User.findById(mentorId).select('name email').lean()
  ]);
  const start = new Date(booking.startTime).toISOString();
  const details = `${message}\n\nSession: ${start}\nDuration: 60 minutes\nBooking reference: ${booking._id}`;
  await Promise.all([
    sendEmail({ to: learner?.email, subject, text: `Hello ${learner?.name || 'there'},\n\n${details}` }),
    sendEmail({ to: mentor?.email, subject, text: `Hello ${mentor?.name || 'there'},\n\n${details}` })
  ]);
}

function sendBookingConfirmation(booking) {
  return sendBookingEmails(booking, 'Your Mentor-Match session is confirmed', 'Your session booking is confirmed.');
}

function sendBookingCancellation(booking, recipientId) {
  return User.findById(recipientId).select('name email').lean().then((recipient) => sendEmail({
    to: recipient?.email,
    subject: 'A Mentor-Match session was cancelled',
    text: `Hello ${recipient?.name || 'there'},\n\nA session scheduled for ${new Date(booking.startTime).toISOString()} was cancelled.`
  }));
}

function sendSessionReminder(booking, recipient) {
  return sendEmail({
    to: recipient.email,
    subject: 'Your Mentor-Match session starts soon',
    text: `Hello ${recipient.name || 'there'},\n\nYour session starts at ${new Date(booking.startTime).toISOString()}.`
  });
}

function sendReviewRequest(booking, learner) {
  return sendEmail({
    to: learner.email,
    subject: 'How was your Mentor-Match session?',
    text: `Hello ${learner.name || 'there'},\n\nYour session is complete. Sign in to leave a review. Booking reference: ${booking._id}.`
  });
}

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

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendSessionReminder,
  sendReviewRequest,
  sendPasswordChangedEmail,
  sendPasswordResetEmail
};