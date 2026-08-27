"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEmailWorker = initializeEmailWorker;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const email_queue_1 = require("../queues/email.queue");
const rate_limit_service_1 = require("../services/rate-limit.service");
const email_service_1 = require("../services/email.service");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
// Helper delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function initializeEmailWorker() {
    const worker = new bullmq_1.Worker(email_queue_1.EMAIL_QUEUE_NAME, async (job) => {
        const { emailJobId, senderId, hourlyLimit } = job.data;
        logger_1.logger.info({ jobId: job.id, emailJobId }, '🔨 BullMQ Worker picked up email job');
        // Step 1: Idempotency & Database State Lock (SCHEDULED -> PROCESSING)
        // Transaction ensures no two workers process the same DB record simultaneously
        const dbJob = await prisma.emailJob.findUnique({
            where: { id: emailJobId },
            include: { sender: true },
        });
        if (!dbJob) {
            logger_1.logger.warn({ emailJobId }, '⚠️ EmailJob record not found in PostgreSQL. Skipping.');
            return;
        }
        if (dbJob.status === 'SENT') {
            logger_1.logger.info({ emailJobId }, '✅ Job already marked as SENT in DB. Skipping duplicate send.');
            return;
        }
        // Transition status to PROCESSING atomically
        const updatedCount = await prisma.emailJob.updateMany({
            where: { id: emailJobId, status: 'SCHEDULED' },
            data: { status: 'PROCESSING', bullJobId: job.id },
        });
        if (updatedCount.count === 0 && dbJob.status !== 'PROCESSING') {
            logger_1.logger.warn({ emailJobId, currentStatus: dbJob.status }, '⚠️ Concurrent lock acquired by another process. Skipping.');
            return;
        }
        // Step 2: Atomic Redis Rate Limit Check
        const rateLimitCheck = await rate_limit_service_1.RateLimitService.reserveSendSlot(senderId, hourlyLimit);
        if (!rateLimitCheck.allowed) {
            const rescheduleDelayMs = rateLimitCheck.rescheduleDelayMs || 3600000;
            const nextAvailableSlot = rateLimitCheck.nextAvailableSlot || new Date(Date.now() + 3600000);
            logger_1.logger.warn({ emailJobId, senderId, nextAvailableSlot, rescheduleDelayMs }, '🔄 Rate limit exceeded. Re-scheduling delayed job in BullMQ to next hourly window.');
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
            await email_queue_1.emailQueue.add(`email-send-rescheduled-${emailJobId}`, { ...job.data, scheduledAtIso: nextAvailableSlot.toISOString() }, { delay: rescheduleDelayMs });
            return; // Complete current job run safely without dropping
        }
        // Step 3: Enforce Minimum Delay Between Email Sends (MIN_SEND_DELAY_MS)
        if (env_1.env.MIN_SEND_DELAY_MS > 0) {
            await sleep(env_1.env.MIN_SEND_DELAY_MS);
        }
        // Step 4: Dispatch Email via Nodemailer + Ethereal SMTP
        try {
            const mailResult = await email_service_1.EmailService.sendMail({
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
            logger_1.logger.info({ emailJobId, recipient: dbJob.recipient, previewUrl: mailResult.previewUrl }, '🎉 EmailJob processed & marked as SENT in database');
        }
        catch (err) {
            const attempts = (dbJob.attempts || 0) + 1;
            const errorMessage = err?.message || 'Unknown SMTP error during email delivery';
            logger_1.logger.error({ emailJobId, err: errorMessage, attempts }, '❌ SMTP delivery failed');
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
    }, {
        connection: redis_1.redisConnection,
        concurrency: env_1.env.WORKER_CONCURRENCY,
    });
    worker.on('completed', (job) => {
        logger_1.logger.info({ jobId: job.id }, '✅ BullMQ worker job completed');
    });
    worker.on('failed', (job, err) => {
        logger_1.logger.error({ jobId: job?.id, err: err.message }, '❌ BullMQ worker job failed');
    });
    logger_1.logger.info({ concurrency: env_1.env.WORKER_CONCURRENCY }, '🚀 BullMQ Email Worker initialized');
    return worker;
}
