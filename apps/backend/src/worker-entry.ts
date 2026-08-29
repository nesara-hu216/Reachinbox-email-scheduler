import { initializeEmailWorker } from './workers/email.worker';
import { logger } from './utils/logger';

logger.info('==================================================');
logger.info('🚀 Starting Standalone BullMQ Email Worker Process...');
logger.info('==================================================');

const worker = initializeEmailWorker();

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Closing BullMQ worker...`);
  if (worker) {
    await worker.close();
  }
  logger.info('BullMQ worker process closed safely.');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
