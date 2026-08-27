"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHourWindowKey = getHourWindowKey;
exports.getNextHourWindowStart = getNextHourWindowStart;
exports.getMsUntilNextHourWindow = getMsUntilNextHourWindow;
exports.calculateRecipientSchedule = calculateRecipientSchedule;
/**
 * Formats a Date object into a hourly window string format: YYYY-MM-DD-HH
 * Example: 2026-08-27-10
 */
function getHourWindowKey(date = new Date()) {
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
function getNextHourWindowStart(date = new Date()) {
    const next = new Date(date.getTime());
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
}
/**
 * Calculates the remaining time in milliseconds until the start of the next hourly window.
 */
function getMsUntilNextHourWindow(date = new Date()) {
    const nextHourStart = getNextHourWindowStart(date);
    return Math.max(0, nextHourStart.getTime() - date.getTime());
}
function calculateRecipientSchedule(recipients, startTime, delayBetweenEmailsMs, hourlyLimit) {
    const schedule = [];
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
