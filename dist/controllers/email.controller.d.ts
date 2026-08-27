import { Request, Response } from 'express';
export declare class EmailController {
    /**
     * GET /api/emails/scheduled
     * Returns emails with status SCHEDULED or PROCESSING
     */
    static getScheduledEmails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/emails/sent
     * Returns emails with status SENT or FAILED
     */
    static getSentEmails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/emails/stats
     * Returns dashboard summary statistics (Total, Scheduled, Sent, Failed)
     */
    static getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/emails/senders
     * Returns active sender accounts
     */
    static getSenders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/emails/:id
     * Get single EmailJob detail
     */
    static getEmailById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
