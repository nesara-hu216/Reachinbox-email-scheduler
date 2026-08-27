"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
class HealthController {
    static async getHealth(req, res) {
        let dbStatus = 'disconnected';
        let redisStatus = 'disconnected';
        try {
            await prisma.$queryRaw `SELECT 1`;
            dbStatus = 'connected';
        }
        catch (e) {
            // Database check log
        }
        try {
            const pingRes = await redis_1.redisConnection.ping();
            if (pingRes === 'PONG') {
                redisStatus = 'connected';
            }
        }
        catch (e) {
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
                google: (0, env_1.isGoogleOauthConfigured)() ? 'configured' : 'not_configured',
            },
            timestamp: new Date().toISOString(),
        });
    }
}
exports.HealthController = HealthController;
