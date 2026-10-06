const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);