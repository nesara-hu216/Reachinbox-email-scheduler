import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const prisma = new PrismaClient();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check Passport session auth
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }

    // 2. Check Express session auth fallback
    if ((req.session as any)?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: (req.session as any).userId },
      });
      if (user) {
        req.user = user;
        return next();
      }
    }

    // 3. Check HTTP Authorization Header / Cookie JWT
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in with Google to continue.',
      },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired.',
      },
    });
  }
}
