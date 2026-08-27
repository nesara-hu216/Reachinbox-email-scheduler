import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('📡 Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  logger.error({ err }, '❌ Redis connection error');
});
