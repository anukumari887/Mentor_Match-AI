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

async function sendEmail({ to, subject, text }) {
  if (!to) return;
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text });
  } catch (error) {
    logger.warn({ message: error.message }, 'Could not send session email');
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

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendSessionReminder,
  sendReviewRequest
};