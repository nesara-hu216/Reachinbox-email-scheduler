import { Request, Response } from 'express';
export declare class AuthController {
    static handleOAuthCallback(req: Request, res: Response): void;
    static getMe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: Request, res: Response): Response<any, Record<string, any>>;
    /**
     * Development helper login endpoint
     */
    static devLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Diagnostic status endpoint: GET /api/auth/google/status
     * Always returns HTTP 200 OK without exposing sensitive secrets
     */
    static getOAuthStatus(req: Request, res: Response): Response<any, Record<string, any>>;
}
