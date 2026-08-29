import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let memoryServerInstance: any = null;
let isStartingServer = false;

async function startFallbackRedisServer() {
  if (env.NODE_ENV === 'production' || isStartingServer || memoryServerInstance) return;
  isStartingServer = true;
  try {
    logger.info('⚡ Local Redis not detected. Auto-starting embedded Redis server...');
    const { RedisMemoryServer } = await import('redis-memory-server');
    memoryServerInstance = new RedisMemoryServer({ instance: { port: 6379 } });
    await memoryServerInstance.start();
    logger.info('✅ Embedded Redis server running successfully on port 6379');
  } catch (e: any) {
    logger.warn({ err: e.message }, '⚠️ Failed to auto-start embedded Redis server');
  } finally {
    isStartingServer = false;
  }
}

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times === 1) {
      startFallbackRedisServer();
    }
    const delay = Math.min(times * 300, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('📡 Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  if (err.message?.includes('ECONNREFUSED')) {
    startFallbackRedisServer();
  } else {
    logger.error({ err }, '❌ Redis connection error');
  }
});
