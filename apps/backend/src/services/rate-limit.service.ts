import { redisConnection } from '../config/redis';
import { getHourWindowKey, getMsUntilNextHourWindow, getNextHourWindowStart } from '../utils/date.utils';
import { logger } from '../utils/logger';

export interface ReserveSlotResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  rescheduleDelayMs?: number;
  nextAvailableSlot?: Date;
}

export class RateLimitService {
  /**
   * Redis Lua Script for Atomic Rate Limit Checking and Incrementing.
   * Guarantees zero race conditions across multiple worker instances.
   */
  private static LUA_RESERVE_SLOT = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttl = tonumber(ARGV[2])
    
    local current = redis.call('GET', key)
    if current and tonumber(current) >= limit then
      return {0, tonumber(current)}
    else
      local new_count = redis.call('INCR', key)
      if new_count == 1 then
        redis.call('EXPIRE', key, ttl)
      end
      return {1, new_count}
    end
  `;

  /**
   * Atomically checks and reserves a sending slot for a given sender in the current hour window.
   * If limit is reached, returns allowed: false along with recommended reschedule delay and next available time slot.
   */
  public static async reserveSendSlot(
    senderId: string,
    hourlyLimit: number
  ): Promise<ReserveSlotResult> {
    const now = new Date();
    const hourKey = getHourWindowKey(now);
    const redisKey = `email-rate:${senderId}:${hourKey}`;
    const ttlSeconds = 7200; // 2 hour TTL to ensure clean Redis memory cleanup

    try {
      // Execute atomic Lua script in Redis
      const result = (await redisConnection.eval(
        this.LUA_RESERVE_SLOT,
        1,
        redisKey,
        hourlyLimit.toString(),
        ttlSeconds.toString()
      )) as [number, number];

      const [allowedFlag, currentCount] = result;
      const allowed = allowedFlag === 1;

      if (allowed) {
        logger.info(
          { senderId, hourKey, currentCount, hourlyLimit },
          '⚡ Rate limit slot successfully reserved'
        );
        return { allowed, currentCount, limit: hourlyLimit };
      } else {
        const rescheduleDelayMs = getMsUntilNextHourWindow(now) + 1000; // +1s buffer
        const nextAvailableSlot = getNextHourWindowStart(now);

        logger.warn(
          { senderId, hourKey, currentCount, hourlyLimit, nextAvailableSlot },
          '🛑 Rate limit reached for sender in current hour window. Job will be rescheduled.'
        );

        return {
          allowed: false,
          currentCount,
          limit: hourlyLimit,
          rescheduleDelayMs,
          nextAvailableSlot,
        };
      }
    } catch (error) {
      logger.error({ error, senderId }, 'Error checking rate limit in Redis');
      // In case of Redis glitch, allow send to avoid blocking critical jobs, but log warning
      return { allowed: true, currentCount: 0, limit: hourlyLimit };
    }
  }

  /**
   * Helper to check current count without incrementing
   */
  public static async getCurrentCount(senderId: string): Promise<number> {
    const hourKey = getHourWindowKey(new Date());
    const redisKey = `email-rate:${senderId}:${hourKey}`;
    const val = await redisConnection.get(redisKey);
    return val ? parseInt(val, 10) : 0;
  }
}
