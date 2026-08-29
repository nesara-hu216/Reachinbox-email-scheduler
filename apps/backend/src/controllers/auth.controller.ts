import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env, isGoogleOauthConfigured, getGoogleOAuthDiagnosticInfo } from '../config/env';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class AuthController {
  public static handleOAuthCallback(req: Request, res: Response) {
    const user = req.user as any;
    if (!user) {
      return res.redirect(`${env.FRONTEND_URL}/?error=auth_failed`);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '7d' });

    // Set HTTP-only secure cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ userId: user.id, email: user.email }, 'User successfully logged in via Google OAuth');
    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
  }

  public static async getMe(req: Request, res: Response) {
    const user = req.user as any;
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

  public static logout(req: Request, res: Response) {
    res.clearCookie('auth_token');
    if (req.logout) {
      req.logout(() => {});
    }
    if (req.session) {
      req.session.destroy(() => {});
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  /**
   * Development helper login endpoint
   */
  public static async devLogin(req: Request, res: Response) {
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

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (req.session) {
      (req.session as any).userId = user.id;
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
  public static getOAuthStatus(req: Request, res: Response) {
    const diag = getGoogleOAuthDiagnosticInfo();
    const configured = isGoogleOauthConfigured();

    if (!configured) {
      return res.status(200).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message:
            'Google OAuth Client ID or Client Secret is invalid/missing in backend/.env. Ensure GOOGLE_CLIENT_ID ends in .apps.googleusercontent.com and GOOGLE_CLIENT_SECRET matches in Google Cloud Console.',
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
