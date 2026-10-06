const { z } = require('zod');

// Time validation helper (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Single availability window schema
const availabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm 24-hour format'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm 24-hour format')
}).refine(
  (window) => timeToMinutes(window.startTime) < timeToMinutes(window.endTime),
  {
    message: 'Window start time must be before end time',
    path: ['startTime']
  }
);

// Array of windows with overlap detection per dayOfWeek
const availabilityArraySchema = z.array(availabilityWindowSchema).superRefine((windows, ctx) => {
  const windowsByDay = {};

  windows.forEach((win, index) => {
    if (!windowsByDay[win.dayOfWeek]) {
      windowsByDay[win.dayOfWeek] = [];
    }
    windowsByDay[win.dayOfWeek].push({
      index,
      start: timeToMinutes(win.startTime),
      end: timeToMinutes(win.endTime)
    });
  });

  for (const day in windowsByDay) {
    const dayWindows = windowsByDay[day].sort((a, b) => a.start - b.start);
    for (let i = 1; i < dayWindows.length; i++) {
      const prev = dayWindows[i - 1];
      const curr = dayWindows[i];
      if (curr.start < prev.end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Overlapping availability windows detected for day ${day}`,
          path: [curr.index]
        });
      }
    }
  }
});

const learnerProfileUpdateSchema = z.object({
  goals: z.string().max(500, 'Goals cannot exceed 500 characters').optional(),
  knownSkills: z.array(z.string().trim()).optional(),
  wantedSkills: z.array(z.string().trim()).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  budgetPerHour: z.number().int().min(0, 'Budget must be a non-negative integer').optional(),
  availability: availabilityArraySchema.optional()
}).strict();

const mentorProfileUpdateSchema = z.object({
  headline: z.string().max(120, 'Headline cannot exceed 120 characters').optional(),
  bio: z.string().max(1500, 'Bio cannot exceed 1500 characters').optional(),
  skills: z.array(z.string().trim()).optional(),
  experienceYears: z.number().int().min(0).max(60, 'Experience years must be between 0 and 60').optional(),
  pricePerHour: z.number().int().min(100).max(20000, 'Price per hour must be between Rs. 100 and Rs. 20,000').optional(),
  timezone: z.string().min(1).default('Asia/Kolkata').optional(),
  availability: availabilityArraySchema.optional()
}).strict();

const availabilityUpdateSchema = z.object({
  availability: availabilityArraySchema
}).strict();

module.exports = {
  availabilityWindowSchema,
  availabilityArraySchema,
  learnerProfileUpdateSchema,
  mentorProfileUpdateSchema,
  availabilityUpdateSchema
};
