const { env } = require('../config/env');

function formatUtcIcs(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
}

/**
 * Folds lines longer than 75 bytes per RFC 5545 (CRLF followed by a single space).
 */
function foldIcsLine(line) {
  const maxBytes = 75;
  const lineBuffer = Buffer.from(line, 'utf8');
  if (lineBuffer.length <= maxBytes) {
    return line;
  }

  let result = '';
  let currentBytes = 0;
  let currentChunk = '';
  let isFirstLine = true;

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    const limit = isFirstLine ? maxBytes : maxBytes - 1; // continuation lines include leading space (1 byte)

    if (currentBytes + charBytes > limit) {
      if (result) {
        result += '\r\n ' + currentChunk;
      } else {
        result = currentChunk;
      }
      isFirstLine = false;
      currentChunk = char;
      currentBytes = charBytes;
    } else {
      currentChunk += char;
      currentBytes += charBytes;
    }
  }

  if (currentChunk) {
    if (result) {
      result += '\r\n ' + currentChunk;
    } else {
      result = currentChunk;
    }
  }

  return result;
}

function generateIcsCalendar({ booking, otherPersonName, otherUserName, appUrl }) {
  const baseUrl = appUrl || env.PUBLIC_APP_URL || 'http://localhost:3000';
  let host = 'localhost';
  try {
    const parsed = new URL(baseUrl);
    host = parsed.hostname || host;
  } catch {}

  const bookingId = String(booking._id || booking.id);
  const joinUrl = `${baseUrl}/session/${bookingId}`;
  const now = new Date();

  const otherName = otherUserName || otherPersonName || 'Mentor';
  const summary = `Mentor-Match session with ${otherName}`;
  const description = `Mentor-Match session with ${otherName}\\nJoin link: ${joinUrl}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mentor-Match AI//Session Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${bookingId}@${host}`,
    `DTSTAMP:${formatUtcIcs(now)}`,
    `DTSTART:${formatUtcIcs(booking.startTime)}`,
    `DTEND:${formatUtcIcs(booking.endTime)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${joinUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText('Session reminder')}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

module.exports = {
  formatUtcIcs,
  escapeIcsText,
  foldIcsLine,
  generateIcsCalendar,
  generateIcs: generateIcsCalendar
};
