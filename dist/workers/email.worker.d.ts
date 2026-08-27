import { Worker } from 'bullmq';
import { EmailJobData } from '../queues/email.queue';
export declare function initializeEmailWorker(): Worker<EmailJobData>;
