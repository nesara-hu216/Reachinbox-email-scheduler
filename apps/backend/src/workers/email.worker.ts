import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from '../queues/email.queue';
import { RateLimitService } from '../services/rate-limit.service';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Helper delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initializeEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId, senderId, hourlyLimit } = job.data;
      logger.info({ jobId: job.id, emailJobId }, '🔨 BullMQ Worker picked up email job');

      // Step 1: Idempotency & Database State Lock (SCHEDULED -> PROCESSING)
      // Transaction ensures no two workers process the same DB record simultaneously
      const dbJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { sender: true },
      });

      if (!dbJob) {
        logger.warn({ emailJobId }, '⚠️ EmailJob record not found in PostgreSQL. Skipping.');
        return;
      }

      if (dbJob.status === 'SENT') {
        logger.info({ emailJobId }, '✅ Job already marked as SENT in DB. Skipping duplicate send.');
        return;
      }

      // Transition status to PROCESSING atomically
      const updatedCount = await prisma.emailJob.updateMany({
        where: { id: emailJobId, status: 'SCHEDULED' },
        data: { status: 'PROCESSING', bullJobId: job.id },
      });

      if (updatedCount.count === 0 && dbJob.status !== 'PROCESSING') {
        logger.warn({ emailJobId, currentStatus: dbJob.status }, '⚠️ Concurrent lock acquired by another process. Skipping.');
        return;
      }

      // Step 2: Atomic Redis Rate Limit Check
      const rateLimitCheck = await RateLimitService.reserveSendSlot(senderId, hourlyLimit);

      if (!rateLimitCheck.allowed) {
        const rescheduleDelayMs = rateLimitCheck.rescheduleDelayMs || 3600000;
        const nextAvailableSlot = rateLimitCheck.nextAvailableSlot || new Date(Date.now() + 3600000);

        logger.warn(
          { emailJobId, senderId, nextAvailableSlot, rescheduleDelayMs },
          '🔄 Rate limit exceeded. Re-scheduling delayed job in BullMQ to next hourly window.'
        );

        // Revert DB status to SCHEDULED & update scheduledAt time
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SCHEDULED',
            scheduledAt: nextAvailableSlot,
            lastError: `Rate limit of ${hourlyLimit}/hr exceeded. Automatically rescheduled to ${nextAvailableSlot.toISOString()}`,
          },
        });

        // Re-enqueue job in BullMQ for next available hour
        await emailQueue.add(
          `email-send-rescheduled-${emailJobId}`,
          { ...job.data, scheduledAtIso: nextAvailableSlot.toISOString() },
          { delay: rescheduleDelayMs }
        );

        return; // Complete current job run safely without dropping
      }

      // Step 3: Enforce Minimum Delay Between Email Sends (MIN_SEND_DELAY_MS)
      if (env.MIN_SEND_DELAY_MS > 0) {
        await sleep(env.MIN_SEND_DELAY_MS);
      }

      // Step 4: Dispatch Email via Nodemailer + Ethereal SMTP
      try {
        const mailResult = await EmailService.sendMail({
          senderEmail: dbJob.sender.email,
          senderName: dbJob.sender.name,
          etherealUser: dbJob.sender.etherealUser,
          etherealPass: dbJob.sender.etherealPassword,
          recipient: dbJob.recipient,
          subject: dbJob.subject,
          body: dbJob.body,
        });

        // Step 5: Mark Job as SENT in Database
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: mailResult.previewUrl,
            lastError: null,
          },
        });

        logger.info(
          { emailJobId, recipient: dbJob.recipient, previewUrl: mailResult.previewUrl },
          '🎉 EmailJob processed & marked as SENT in database'
        );
      } catch (err: any) {
        const attempts = (dbJob.attempts || 0) + 1;
        const errorMessage = err?.message || 'Unknown SMTP error during email delivery';

        logger.error({ emailJobId, err: errorMessage, attempts }, '❌ SMTP delivery failed');

        const isFinalAttempt = attempts >= (job.opts.attempts || 3);

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            attempts,
            lastError: errorMessage,
            status: isFinalAttempt ? 'FAILED' : 'SCHEDULED',
          },
        });

        throw err; // Trigger BullMQ retry backoff if attempts remain
      }
    },
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '✅ BullMQ worker job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '❌ BullMQ worker job failed');
  });

  logger.info({ concurrency: env.WORKER_CONCURRENCY }, '🚀 BullMQ Email Worker initialized');

  return worker;
}
