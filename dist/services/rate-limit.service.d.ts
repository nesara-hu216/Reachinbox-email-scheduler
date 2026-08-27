export interface ReserveSlotResult {
    allowed: boolean;
    currentCount: number;
    limit: number;
    rescheduleDelayMs?: number;
    nextAvailableSlot?: Date;
}
export declare class RateLimitService {
    /**
     * Redis Lua Script for Atomic Rate Limit Checking and Incrementing.
     * Guarantees zero race conditions across multiple worker instances.
     */
    private static LUA_RESERVE_SLOT;
    /**
     * Atomically checks and reserves a sending slot for a given sender in the current hour window.
     * If limit is reached, returns allowed: false along with recommended reschedule delay and next available time slot.
     */
    static reserveSendSlot(senderId: string, hourlyLimit: number): Promise<ReserveSlotResult>;
    /**
     * Helper to check current count without incrementing
     */
    static getCurrentCount(senderId: string): Promise<number>;
}
