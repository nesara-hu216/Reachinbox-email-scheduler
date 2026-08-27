import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

export interface EmailJobData {
  emailJobId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAtIso: string;
  hourlyLimit: number;
}

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
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

emailQueue.on('error', (err) => {
  logger.error({ err }, '❌ BullMQ Queue Error');
});

/**
 * Bulk enqueue helper utilizing BullMQ's optimized addBulk()
 */
export async function scheduleEmailJobsInBulk(
  jobs: Array<{
    emailJobId: string;
    campaignId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    hourlyLimit: number;
  }>
) {
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

  logger.info({ count: bulkPayloads.length }, '🚀 Bulk enqueuing jobs into BullMQ delayed queue...');
  const createdJobs = await emailQueue.addBulk(bulkPayloads);
  return createdJobs;
}
