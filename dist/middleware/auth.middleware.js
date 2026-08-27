"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
async function requireAuth(req, res, next) {
    try {
        // 1. Check Passport session auth
        if (req.isAuthenticated && req.isAuthenticated() && req.user) {
            return next();
        }
        // 2. Check Express session auth fallback
        if (req.session?.userId) {
            const user = await prisma.user.findUnique({
                where: { id: req.session.userId },
            });
            if (user) {
                req.user = user;
                return next();
            }
        }
        // 3. Check HTTP Authorization Header / Cookie JWT
        const token = req.cookies?.auth_token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null);
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
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
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Authentication token is invalid or expired.',
            },
        });
    }
}
