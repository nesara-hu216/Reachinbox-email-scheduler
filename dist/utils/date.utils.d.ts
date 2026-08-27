/**
 * Formats a Date object into a hourly window string format: YYYY-MM-DD-HH
 * Example: 2026-08-27-10
 */
export declare function getHourWindowKey(date?: Date): string;
/**
 * Calculates the exact start Date of the next hourly window in UTC.
 * Example: If current date is 2026-08-27 10:25:30 UTC, returns 2026-08-27 11:00:00 UTC.
 */
export declare function getNextHourWindowStart(date?: Date): Date;
/**
 * Calculates the remaining time in milliseconds until the start of the next hourly window.
 */
export declare function getMsUntilNextHourWindow(date?: Date): number;
/**
 * Helper to calculate recipient schedule times given start time, delay, and hourly limit limits.
 */
export interface ScheduleCalculationItem {
    index: number;
    recipient: string;
    scheduledAt: Date;
    windowIndex: number;
}
export declare function calculateRecipientSchedule(recipients: string[], startTime: Date, delayBetweenEmailsMs: number, hourlyLimit: number): ScheduleCalculationItem[];
