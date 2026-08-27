"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class AuthController {
    static handleOAuthCallback(req, res) {
        const user = req.user;
        if (!user) {
            return res.redirect(`${env_1.env.FRONTEND_URL}/?error=auth_failed`);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.env.JWT_SECRET, { expiresIn: '7d' });
        // Set HTTP-only secure cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        logger_1.logger.info({ userId: user.id, email: user.email }, 'User successfully logged in via Google OAuth');
        return res.redirect(`${env_1.env.FRONTEND_URL}/dashboard`);
    }
    static async getMe(req, res) {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated',
                error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
            });
        }
        const userData = {
            id: user.id,
            googleId: user.googleId,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
        };
        return res.json({
            success: true,
            user: userData,
            data: userData,
        });
    }
    static logout(req, res) {
        res.clearCookie('auth_token');
        if (req.logout) {
            req.logout(() => { });
        }
        if (req.session) {
            req.session.destroy(() => { });
        }
        return res.json({ success: true, message: 'Logged out successfully' });
    }
    /**
     * Development helper login endpoint
     */
    static async devLogin(req, res) {
        const { email, name } = req.body;
        const userEmail = email || 'demo@reachinbox.com';
        const userName = name || 'ReachInbox Demo User';
        const user = await prisma.user.upsert({
            where: { email: userEmail },
            update: { name: userName },
            create: {
                email: userEmail,
                name: userName,
                googleId: `dev-google-${Date.now()}`,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail)}`,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        if (req.session) {
            req.session.userId = user.id;
        }
        return res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatarUrl,
                },
            },
        });
    }
    /**
     * Diagnostic status endpoint: GET /api/auth/google/status
     * Always returns HTTP 200 OK without exposing sensitive secrets
     */
    static getOAuthStatus(req, res) {
        const diag = (0, env_1.getGoogleOAuthDiagnosticInfo)();
        const configured = (0, env_1.isGoogleOauthConfigured)();
        if (!configured) {
            return res.status(200).json({
                success: false,
                error: {
                    code: 'OAUTH_NOT_CONFIGURED',
                    message: 'Google OAuth Client ID or Client Secret is invalid/missing in backend/.env. Ensure GOOGLE_CLIENT_ID ends in .apps.googleusercontent.com and GOOGLE_CLIENT_SECRET matches in Google Cloud Console.',
                },
                googleOAuth: diag,
            });
        }
        return res.status(200).json({
            success: true,
            googleOAuth: diag,
        });
    }
}
exports.AuthController = AuthController;
