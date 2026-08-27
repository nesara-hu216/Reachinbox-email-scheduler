import { Request, Response } from 'express';
import { z } from 'zod';
export declare const createCampaignSchema: z.ZodObject<{
    body: z.ZodObject<{
        subject: z.ZodString;
        body: z.ZodString;
        recipients: z.ZodArray<z.ZodString, "many">;
        startTime: z.ZodString;
        delayBetweenEmails: z.ZodNumber;
        hourlyLimit: z.ZodNumber;
        senderId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        body: string;
        subject: string;
        recipients: string[];
        startTime: string;
        delayBetweenEmails: number;
        hourlyLimit: number;
        senderId?: string | undefined;
    }, {
        body: string;
        subject: string;
        recipients: string[];
        startTime: string;
        delayBetweenEmails: number;
        hourlyLimit: number;
        senderId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        body: string;
        subject: string;
        recipients: string[];
        startTime: string;
        delayBetweenEmails: number;
        hourlyLimit: number;
        senderId?: string | undefined;
    };
}, {
    body: {
        body: string;
        subject: string;
        recipients: string[];
        startTime: string;
        delayBetweenEmails: number;
        hourlyLimit: number;
        senderId?: string | undefined;
    };
}>;
export declare class CampaignController {
    /**
     * POST /api/campaigns
     * Creates campaign, calculates recipient schedule, bulk inserts EmailJob records into PostgreSQL,
     * and enqueues delayed jobs into BullMQ.
     */
    static createCampaign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/campaigns
     * List campaigns for the authenticated user
     */
    static getCampaigns(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/campaigns/:id
     * Get single campaign details
     */
    static getCampaignById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
