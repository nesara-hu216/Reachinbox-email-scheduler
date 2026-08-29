export type JobStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface User {
  id: string;
  googleId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    emailJobs: number;
  };
}

export interface EmailJob {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: JobStatus;
  attempts: number;
  lastError?: string | null;
  bullJobId?: string | null;
  idempotencyKey: string;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  campaign?: {
    id: string;
    subject: string;
  };
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderId?: string;
}

export interface ScheduleResponse {
  campaignId: string;
  totalRecipients: number;
  scheduledCount: number;
  firstScheduledTime: string;
  lastScheduledTime: string;
}

export interface StatsSummary {
  total: number;
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
