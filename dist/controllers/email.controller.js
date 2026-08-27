"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EmailController {
    /**
     * GET /api/emails/scheduled
     * Returns emails with status SCHEDULED or PROCESSING
     */
    static async getScheduledEmails(req, res) {
        const user = req.user;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const search = req.query.search || '';
        const whereCondition = {
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
    static async getSentEmails(req, res) {
        const user = req.user;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const search = req.query.search || '';
        const statusFilter = req.query.status;
        const whereCondition = {
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
    static async getStats(req, res) {
        const user = req.user;
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
    static async getSenders(req, res) {
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
    static async getEmailById(req, res) {
        const user = req.user;
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
exports.EmailController = EmailController;
