const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const { connectMongoWithRetry } = require('../src/config/database');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');

async function seedVideoDemo() {
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
    console.error('ERROR: Refusing to run seed-video-demo in production!');
    process.exit(1);
  }

  await connectMongoWithRetry();

  const learner = await User.findOne({ email: 'learner01@mentormatch.local' });
  const mentor = await User.findOne({ email: 'mentor01@mentormatch.local' });

  if (!learner || !mentor) {
    console.error('ERROR: demo accounts learner01@mentormatch.local or mentor01@mentormatch.local not found. Run npm run seed first.');
    process.exit(1);
  }

  // Idempotency: clean up previous video demo booking
  const previousDemo = await Booking.findOne({
    learnerId: learner._id,
    mentorId: mentor._id,
    cancelReason: 'seed-video-demo'
  });

  if (previousDemo) {
    await Payment.deleteMany({ bookingId: previousDemo._id });
    await Booking.deleteOne({ _id: previousDemo._id });
  }

  // Create confirmed booking starting 3 minutes from now and ending 63 minutes from now
  const now = Date.now();
  const startTime = new Date(now + 3 * 60 * 1000);
  const endTime = new Date(now + 63 * 60 * 1000);
  const priceAtBooking = 900;
  const amountPaise = priceAtBooking * 100;
  const platformFeePaise = Math.round(amountPaise * 0.15);
  const mentorEarningPaise = amountPaise - platformFeePaise;

  const booking = await Booking.create({
    learnerId: learner._id,
    mentorId: mentor._id,
    startTime,
    endTime,
    priceAtBooking,
    status: 'confirmed',
    holdsSlot: true,
    cancelReason: 'seed-video-demo'
  });

  const payment = await Payment.create({
    bookingId: booking._id,
    learnerId: learner._id,
    mentorId: mentor._id,
    amount: amountPaise,
    platformFee: platformFeePaise,
    mentorEarning: mentorEarningPaise,
    currency: 'INR',
    gateway: 'mock',
    gatewayOrderId: `demo_order_${booking._id}`,
    gatewayPaymentId: `demo_pay_${booking._id}`,
    status: 'paid',
    paidAt: new Date(),
    earned: false
  });

  booking.paymentId = payment._id;
  await booking.save();

  console.log('\n======================================================');
  console.log('VIDEO & CHAT DEMO BOOKING CREATED (IDEMPOTENT)');
  console.log('======================================================');
  console.log(`Booking ID:    ${booking._id}`);
  console.log(`Start Time:    ${startTime.toISOString()} (opens now: 10m early window active)`);
  console.log(`End Time:      ${endTime.toISOString()}`);
  console.log('------------------------------------------------------');
  console.log('Learner Login: learner01@mentormatch.local / Demo@12345');
  console.log('Mentor Login:  mentor01@mentormatch.local  / Demo@12345');
  console.log('------------------------------------------------------');
  console.log(`Video Room:    http://localhost:3000/session/${booking._id}`);
  console.log('Chat Center:   http://localhost:3000/messages');
  console.log('======================================================\n');

  await mongoose.connection.close();
  process.exit(0);
}

seedVideoDemo().catch((err) => {
  console.error('Seed video demo failed:', err);
  process.exit(1);
});
