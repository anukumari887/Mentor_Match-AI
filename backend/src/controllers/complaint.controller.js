const Complaint = require('../models/Complaint');
const Booking = require('../models/Booking');
const { createComplaintSchema } = require('../validations/complaint.validation');
const { AppError } = require('../utils/errors');

async function createComplaint(req, res, next) {
  try {
    const data = createComplaintSchema.parse(req.body);

    if (data.bookingId) {
      const booking = await Booking.findById(data.bookingId).select('learnerId mentorId').lean();
      if (!booking) {
        return next(new AppError('Associated session was not found.', 404, 'BOOKING_NOT_FOUND'));
      }
      const userIdStr = String(req.user._id);
      if (String(booking.learnerId) !== userIdStr && String(booking.mentorId) !== userIdStr) {
        return next(new AppError('You can only report issues for sessions you participate in.', 403, 'FORBIDDEN'));
      }
    }

    const complaint = await Complaint.create({
      userId: req.user._id,
      bookingId: data.bookingId || null,
      subject: data.subject,
      description: data.description,
      status: 'open'
    });

    return res.status(201).json({ complaint });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createComplaint
};
