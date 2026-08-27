import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmailController {
  /**
   * GET /api/emails/scheduled
   * Returns emails with status SCHEDULED or PROCESSING
   */
  public static async getScheduledEmails(req: Request, res: Response) {
    const user = req.user as any;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const search = (req.query.search as string) || '';

    const whereCondition: any = {
      campaign: { userId: user.id },
      status: { in: ['SCHEDULED', 'PROCESSING'] },
    };

    if (search) {
      whereCondition.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where: whereCondition }),
      prisma.emailJob.findMany({
        where: whereCondition,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, subject: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }

  /**
   * GET /api/emails/sent
   * Returns emails with status SENT or FAILED
   */
  public static async getSentEmails(req: Request, res: Response) {
    const user = req.user as any;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const search = (req.query.search as string) || '';
    const statusFilter = req.query.status as string;

    const whereCondition: any = {
      campaign: { userId: user.id },
      status: statusFilter ? statusFilter : { in: ['SENT', 'FAILED'] },
    };

    if (search) {
      whereCondition.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where: whereCondition }),
      prisma.emailJob.findMany({
        where: whereCondition,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, subject: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }

  /**
   * GET /api/emails/stats
   * Returns dashboard summary statistics (Total, Scheduled, Sent, Failed)
   */
  public static async getStats(req: Request, res: Response) {
    const user = req.user as any;
    const userCampaignWhere = { campaign: { userId: user.id } };

    const [total, scheduled, processing, sent, failed] = await Promise.all([
      prisma.emailJob.count({ where: userCampaignWhere }),
      prisma.emailJob.count({ where: { ...userCampaignWhere, status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { ...userCampaignWhere, status: 'PROCESSING' } }),
      prisma.emailJob.count({ where: { ...userCampaignWhere, status: 'SENT' } }),
      prisma.emailJob.count({ where: { ...userCampaignWhere, status: 'FAILED' } }),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        scheduled,
        processing,
        sent,
        failed,
      },
    });
  }

  /**
   * GET /api/emails/senders
   * Returns active sender accounts
   */
  public static async getSenders(req: Request, res: Response) {
    const senders = await prisma.sender.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: senders,
    });
  }

  /**
   * GET /api/emails/:id
   * Get single EmailJob detail
   */
  public static async getEmailById(req: Request, res: Response) {
    const user = req.user as any;
    const { id } = req.params;

    const job = await prisma.emailJob.findFirst({
      where: { id, campaign: { userId: user.id } },
      include: {
        sender: true,
        campaign: true,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email job not found' },
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  }
}
