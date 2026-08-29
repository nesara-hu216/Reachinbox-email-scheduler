/**
 * Formats a Date object into a hourly window string format: YYYY-MM-DD-HH
 * Example: 2026-08-27-10
 */
export function getHourWindowKey(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

/**
 * Calculates the exact start Date of the next hourly window in UTC.
 * Example: If current date is 2026-08-27 10:25:30 UTC, returns 2026-08-27 11:00:00 UTC.
 */
export function getNextHourWindowStart(date: Date = new Date()): Date {
  const next = new Date(date.getTime());
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

/**
 * Calculates the remaining time in milliseconds until the start of the next hourly window.
 */
export function getMsUntilNextHourWindow(date: Date = new Date()): number {
  const nextHourStart = getNextHourWindowStart(date);
  return Math.max(0, nextHourStart.getTime() - date.getTime());
}

/**
 * Helper to calculate recipient schedule times given start time, delay, and hourly limit limits.
 */
export interface ScheduleCalculationItem {
  index: number;
  recipient: string;
  scheduledAt: Date;
  windowIndex: number;
}

export function calculateRecipientSchedule(
  recipients: string[],
  startTime: Date,
  delayBetweenEmailsMs: number,
  hourlyLimit: number
): ScheduleCalculationItem[] {
  const schedule: ScheduleCalculationItem[] = [];
  const startMs = startTime.getTime();

  for (let i = 0; i < recipients.length; i++) {
    // Basic delayed schedule: startTime + i * delayBetweenEmails
    let itemTimeMs = startMs + i * delayBetweenEmailsMs;

    // Check hourly limit distribution:
    // Every block of `hourlyLimit` emails fits into a sequential hourly window
    const windowIndex = Math.floor(i / hourlyLimit);
    if (windowIndex > 0) {
      // Add window shift: each extra window adds 1 hour (3,600,000 ms)
      const windowOffsetMs = windowIndex * 3600000;
      // Offset starting from the first email of that window
      const positionInWindow = i % hourlyLimit;
      itemTimeMs = startMs + windowOffsetMs + positionInWindow * delayBetweenEmailsMs;
    }

    schedule.push({
      index: i,
      recipient: recipients[i],
      scheduledAt: new Date(itemTimeMs),
      windowIndex,
    });
  }

  return schedule;
}
