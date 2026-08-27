import { Request, Response } from 'express';
export declare class HealthController {
    static getHealth(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
