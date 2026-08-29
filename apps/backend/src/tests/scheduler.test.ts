import { describe, it, expect } from 'vitest';
import {
  getHourWindowKey,
  getNextHourWindowStart,
  getMsUntilNextHourWindow,
  calculateRecipientSchedule,
} from '../utils/date.utils';

describe('Date & Scheduling Utilities', () => {
  it('should correctly format hourly window keys YYYY-MM-DD-HH in UTC', () => {
    const testDate = new Date('2026-08-27T10:15:30.000Z');
    const key = getHourWindowKey(testDate);
    expect(key).toBe('2026-08-27-10');
  });

  it('should calculate the start of the next hourly window', () => {
    const testDate = new Date('2026-08-27T10:15:30.000Z');
    const nextStart = getNextHourWindowStart(testDate);
    expect(nextStart.toISOString()).toBe('2026-08-27T11:00:00.000Z');
  });

  it('should calculate remaining milliseconds until next hour window', () => {
    const testDate = new Date('2026-08-27T10:45:00.000Z'); // 15 mins remaining = 900,000 ms
    const msRemaining = getMsUntilNextHourWindow(testDate);
    expect(msRemaining).toBe(15 * 60 * 1000);
  });

  it('should calculate recipient schedule with hourly limit window distribution', () => {
    const recipients = ['user1@ex.com', 'user2@ex.com', 'user3@ex.com'];
    const startTime = new Date('2026-08-27T10:00:00.000Z');
    const delayMs = 2000;
    const hourlyLimit = 2; // Limit 2 per hour -> user3 goes to next hour window!

    const schedule = calculateRecipientSchedule(recipients, startTime, delayMs, hourlyLimit);

    expect(schedule.length).toBe(3);
    // User 1
    expect(schedule[0].scheduledAt.toISOString()).toBe('2026-08-27T10:00:00.000Z');
    // User 2
    expect(schedule[1].scheduledAt.toISOString()).toBe('2026-08-27T10:00:02.000Z');
    // User 3 (Overflows window 0 -> moves to window 1 at +1 hour = 11:00:00)
    expect(schedule[2].scheduledAt.toISOString()).toBe('2026-08-27T11:00:00.000Z');
  });
});
