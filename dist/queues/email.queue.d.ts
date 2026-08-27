import { Queue } from 'bullmq';
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
export declare const EMAIL_QUEUE_NAME = "email-dispatch-queue";
export declare const emailQueue: Queue<EmailJobData, any, string, EmailJobData, any, string>;
/**
 * Bulk enqueue helper utilizing BullMQ's optimized addBulk()
 */
export declare function scheduleEmailJobsInBulk(jobs: Array<{
    emailJobId: string;
    campaignId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    hourlyLimit: number;
}>): Promise<import("bullmq").Job<EmailJobData, any, string>[]>;
