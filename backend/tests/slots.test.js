const { generateSlots } = require('../src/services/slots');

describe('Availability slot generation', () => {
  it('cuts local weekly windows into UTC 60-minute slots and applies lead time', () => {
    const slots = generateSlots({
      timezone: 'Asia/Kolkata',
      now: new Date('2026-01-05T00:00:00.000Z'),
      availability: [
        { dayOfWeek: 1, startTime: '06:00', endTime: '09:00' },
        { dayOfWeek: 1, startTime: '10:30', endTime: '12:30' }
      ]
    });

    expect(slots.map((slot) => slot.startTime)).toEqual([
      '2026-01-05T00:30:00.000Z',
      '2026-01-05T01:30:00.000Z',
      '2026-01-05T02:30:00.000Z',
      '2026-01-05T05:00:00.000Z',
      '2026-01-05T06:00:00.000Z',
      '2026-01-12T00:30:00.000Z',
      '2026-01-12T01:30:00.000Z',
      '2026-01-12T02:30:00.000Z',
      '2026-01-12T05:00:00.000Z',
      '2026-01-12T06:00:00.000Z'
    ]);
    expect(slots.every((slot) => slot.timezone === 'Asia/Kolkata')).toBe(true);
    expect(new Date(slots[0].endTime).getTime() - new Date(slots[0].startTime).getTime()).toBe(60 * 60 * 1000);
  });

  it('uses the mentor timezone across daylight-saving transitions', () => {
    const slots = generateSlots({
      timezone: 'America/New_York',
      now: new Date('2026-03-08T00:00:00.000Z'),
      availability: [{ dayOfWeek: 0, startTime: '01:00', endTime: '04:00' }]
    });

    expect(slots.map((slot) => slot.startTime)).toEqual([
      '2026-03-08T06:00:00.000Z',
      '2026-03-08T07:00:00.000Z',
      '2026-03-15T05:00:00.000Z',
      '2026-03-15T06:00:00.000Z',
      '2026-03-15T07:00:00.000Z'
    ]);
  });
});