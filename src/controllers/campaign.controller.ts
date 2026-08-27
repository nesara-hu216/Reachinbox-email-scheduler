import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { calculateRecipientSchedule } from '../utils/date.utils';
import { scheduleEmailJobsInBulk } from '../queues/email.queue';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const createCampaignSchema = z.object({
  body: z.object({
    subject: z.string().min(1, 'Subject is required'),
    body: z.string().min(1, 'Email body is required'),
    recipients: z
      .array(z.string().email('Invalid email address format'))
      .min(1, 'At least one recipient is required'),
    startTime: z.string().datetime('startTime must be a valid ISO 8601 string'),
    delayBetweenEmails: z
      .number()
      .int()
      .positive('delayBetweenEmails must be a positive integer in milliseconds'),
    hourlyLimit: z.number().int().positive('hourlyLimit must be a positive integer'),
    senderId: z.string().optional(),
  }),
});

export class CampaignController {
  /**
   * POST /api/campaigns
   * Creates campaign, calculates recipient schedule, bulk inserts EmailJob records into PostgreSQL,
   * and enqueues delayed jobs into BullMQ.
   */
  public static async createCampaign(req: Request, res: Response) {
    const user = req.user as any;
    const {
      subject,
      body,
      recipients,
      startTime: startTimeIso,
      delayBetweenEmails,
      hourlyLimit,
      senderId: requestedSenderId,
    } = req.body;

    const startTime = new Date(startTimeIso);

    // 1. Resolve Sender account
    let sender = requestedSenderId
      ? await prisma.sender.findUnique({ where: { id: requestedSenderId } })
      : await prisma.sender.findFirst();

    if (!sender) {
      logger.info('🔑 Dynamic creation of primary Ethereal sender account for campaign...');
      const testAccount = await nodemailer.createTestAccount();
      sender = await prisma.sender.create({
        data: {
          name: 'ReachInbox Primary Sender',
          email: testAccount.user,
          etherealUser: testAccount.user,
          etherealPassword: testAccount.pass,
        },
      });
    }

    // 2. Remove duplicate emails while preserving sequence
    const uniqueRecipients: string[] = Array.from(new Set((recipients as string[]).map((r: string) => r.trim().toLowerCase())));

    // 3. Compute detailed recipient delivery schedule (handling hourly limit window distribution)
    const scheduleItems = calculateRecipientSchedule(
      uniqueRecipients,
      startTime,
      delayBetweenEmails,
      hourlyLimit
    );

    // 4. Create EmailCampaign record in DB
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: user.id,
        subject,
        body,
        startTime,
        delayBetweenEmails,
        hourlyLimit,
        totalRecipients: uniqueRecipients.length,
      },
    });

    // 5. Build bulk EmailJob data array for PostgreSQL
    const emailJobDbPayloads = scheduleItems.map((item) => ({
      campaignId: campaign.id,
      senderId: sender!.id,
      recipient: item.recipient,
      subject,
      body,
      scheduledAt: item.scheduledAt,
      status: 'SCHEDULED' as const,
      idempotencyKey: `${campaign.id}-${item.recipient}-${item.index}`,
    }));

    // Perform high-performance bulk database insert
    await prisma.emailJob.createMany({
      data: emailJobDbPayloads,
      skipDuplicates: true,
    });

    // 6. Fetch created records to obtain generated UUIDs for BullMQ mapping
    const createdDbJobs = await prisma.emailJob.findMany({
      where: { campaignId: campaign.id },
      select: {
        id: true,
        recipient: true,
        scheduledAt: true,
      },
    });

    // 7. Enqueue delayed jobs into BullMQ using addBulk()
    const queueJobPayloads = createdDbJobs.map((dbJob: { id: string; recipient: string; scheduledAt: Date }) => ({
      emailJobId: dbJob.id,
      campaignId: campaign.id,
      senderId: sender!.id,
      recipient: dbJob.recipient,
      subject,
      body,
      scheduledAt: dbJob.scheduledAt,
      hourlyLimit,
    }));

    await scheduleEmailJobsInBulk(queueJobPayloads);

    const firstScheduled = createdDbJobs[0]?.scheduledAt || startTime;
    const lastScheduled =
      createdDbJobs[createdDbJobs.length - 1]?.scheduledAt || startTime;

    logger.info(
      {
        campaignId: campaign.id,
        totalRecipients: uniqueRecipients.length,
        firstScheduled,
        lastScheduled,
      },
      '🎉 Campaign created and bulk jobs enqueued successfully'
    );

    return res.status(201).json({
      success: true,
      data: {
        campaignId: campaign.id,
        totalRecipients: uniqueRecipients.length,
        scheduledCount: createdDbJobs.length,
        firstScheduledTime: firstScheduled.toISOString(),
        lastScheduledTime: lastScheduled.toISOString(),
      },
    });
  }

  /**
   * GET /api/campaigns
   * List campaigns for the authenticated user
   */
  public static async getCampaigns(req: Request, res: Response) {
    const user = req.user as any;
    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emailJobs: true },
        },
      },
    });

    return res.json({
      success: true,
      data: campaigns,
    });
  }

  /**
   * GET /api/campaigns/:id
   * Get single campaign details
   */
  public static async getCampaignById(req: Request, res: Response) {
    const user = req.user as any;
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, userId: user.id },
      include: {
        emailJobs: {
          take: 100,
          orderBy: { scheduledAt: 'asc' },
          include: { sender: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
    }

    return res.json({
      success: true,
      data: campaign,
    });
  }
}
