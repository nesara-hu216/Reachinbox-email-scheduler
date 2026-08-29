import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/email.queue';
import { initializeEmailWorker } from '../workers/email.worker';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Serverless Worker Batch Processor
 * Endpoint: GET /api/worker/process or POST /api/worker/process
 * Compatible with Vercel Cron Jobs & serverless execution limits
 */
router.all('/process', async (req: Request, res: Response) => {
  logger.info('⚡ Vercel Serverless Worker Execution Triggered');

  try {
    const queue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, { connection: redisConnection });
    const waitingCount = await queue.getWaitingCount();
    const delayedCount = await queue.getDelayedCount();

    logger.info({ waitingCount, delayedCount }, '📊 BullMQ Queue Status');

    // Initialize worker instance to process waiting jobs
    const worker = initializeEmailWorker();

    // Allow worker window to process ready jobs (5 seconds serverless window)
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await worker.close();
    await queue.close();

    return res.status(200).json({
      success: true,
      message: 'Vercel serverless worker batch processed successfully',
      queue: {
        waiting: waitingCount,
        delayed: delayedCount,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, '❌ Vercel serverless worker error');
    return res.status(500).json({
      success: false,
      error: err.message || 'Worker processing error',
    });
  }
});

export const workerRoutes = router;
