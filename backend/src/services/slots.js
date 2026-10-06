const { DateTime } = require('luxon');
const { env } = require('../config/env');

function generateSlots({ availability = [], timezone = 'Asia/Kolkata', now = new Date(), days = 14 }) {
  const currentUtc = DateTime.fromJSDate(now, { zone: 'utc' });
  const earliest = currentUtc.plus({ hours: env.MIN_BOOKING_LEAD_HOURS });
  const today = currentUtc.setZone(timezone).startOf('day');
  const slots = [];

  for (let offset = 0; offset < days; offset++) {
    const localDay = today.plus({ days: offset });
    const dayOfWeek = localDay.weekday % 7;

    for (const window of availability) {
      if (window.dayOfWeek !== dayOfWeek) continue;
      let cursor = localDay.set({
        hour: Number(window.startTime.slice(0, 2)),
        minute: Number(window.startTime.slice(3)),
        second: 0,
        millisecond: 0
      });
      const windowEnd = localDay.set({
        hour: Number(window.endTime.slice(0, 2)),
        minute: Number(window.endTime.slice(3)),
        second: 0,
        millisecond: 0
      });

      while (cursor.isValid && windowEnd.isValid && cursor.plus({ minutes: 60 }) <= windowEnd) {
        const end = cursor.plus({ minutes: 60 });
        if (cursor.toUTC().toMillis() >= earliest.toMillis()) {
          slots.push({
            startTime: cursor.toUTC().toISO(),
            endTime: end.toUTC().toISO(),
            timezone
          });
        }
        cursor = end;
      }
    }
  }

  return slots.sort((left, right) => left.startTime.localeCompare(right.startTime));
}

module.exports = { generateSlots };