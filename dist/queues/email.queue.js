"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.EMAIL_QUEUE_NAME = void 0;
exports.scheduleEmailJobsInBulk = scheduleEmailJobsInBulk;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
exports.EMAIL_QUEUE_NAME = 'email-dispatch-queue';
exports.emailQueue = new bullmq_1.Queue(exports.EMAIL_QUEUE_NAME, {
    connection: redis_1.redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 15s, 45s exponential retry
        },
        removeOnComplete: {
            age: 86400 * 7, // Keep completed jobs in Redis for 7 days for inspection/debugging
            count: 5000,
        },
        removeOnFail: {
            age: 86400 * 14, // Keep failed jobs for 14 days
            count: 5000,
        },
    },
});
exports.emailQueue.on('error', (err) => {
    logger_1.logger.error({ err }, '❌ BullMQ Queue Error');
});
/**
 * Bulk enqueue helper utilizing BullMQ's optimized addBulk()
 */
async function scheduleEmailJobsInBulk(jobs) {
    const now = Date.now();
    const bulkPayloads = jobs.map((job) => {
        const delay = Math.max(0, job.scheduledAt.getTime() - now);
        return {
            name: `email-send-${job.emailJobId}`,
            data: {
                emailJobId: job.emailJobId,
                campaignId: job.campaignId,
                senderId: job.senderId,
                recipient: job.recipient,
                subject: job.subject,
                body: job.body,
                scheduledAtIso: job.scheduledAt.toISOString(),
                hourlyLimit: job.hourlyLimit,
            },
            opts: {
                jobId: job.emailJobId, // Use database EmailJob.id as BullMQ jobId for exact 1:1 mapping
                delay,
            },
        };
    });
    logger_1.logger.info({ count: bulkPayloads.length }, '🚀 Bulk enqueuing jobs into BullMQ delayed queue...');
    const createdJobs = await exports.emailQueue.addBulk(bulkPayloads);
    return createdJobs;
}
