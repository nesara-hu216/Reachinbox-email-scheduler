import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { isGoogleOauthConfigured } from '../config/env';

const prisma = new PrismaClient();

export class HealthController {
  public static async getHealth(req: Request, res: Response) {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e) {
      // Database check log
    }

    try {
      const pingRes = await redisConnection.ping();
      if (pingRes === 'PONG') {
        redisStatus = 'connected';
      }
    } catch (e) {
      // Redis check log
    }

    // Always return HTTP 200 when Express server is running
    return res.status(200).json({
      success: true,
      service: 'reachinbox-backend',
      status: 'healthy',
      database: dbStatus,
      redis: redisStatus,
      oauth: {
        google: isGoogleOauthConfigured() ? 'configured' : 'not_configured',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
