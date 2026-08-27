"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const passport_2 = require("./config/passport");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = require("./routes/auth.routes");
const campaign_routes_1 = require("./routes/campaign.routes");
const email_routes_1 = require("./routes/email.routes");
const health_routes_1 = require("./routes/health.routes");
const email_worker_1 = require("./workers/email.worker");
const app = (0, express_1.default)();
// Security and utility middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: env_1.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use((0, cors_1.default)({
    origin: [env_1.env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Express Session configuration for Passport
app.use((0, express_session_1.default)({
    secret: env_1.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env_1.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));
// Initialize Passport
(0, passport_2.setupPassport)();
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Request logging middleware
app.use((req, res, next) => {
    if (req.path !== '/api/health') {
        logger_1.logger.info({ method: req.method, path: req.path }, 'Incoming Request');
    }
    next();
});
// API Routes
app.use('/api/health', health_routes_1.healthRoutes);
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/campaigns', campaign_routes_1.campaignRoutes);
app.use('/api/emails', email_routes_1.emailRoutes);
// Centralized error middleware
app.use(error_middleware_1.errorHandler);
// Initialize BullMQ Worker
const emailWorker = (0, email_worker_1.initializeEmailWorker)();
// Start Express Server
const server = app.listen(env_1.env.PORT, () => {
    const diag = (0, env_1.getGoogleOAuthDiagnosticInfo)();
    const dbDiag = (0, env_1.getDatabaseDiagnosticInfo)();
    logger_1.logger.info(`==================================================`);
    logger_1.logger.info(`🚀 ReachInbox Backend Server running on port ${env_1.env.PORT}`);
    logger_1.logger.info(`📍 Server URL: ${env_1.env.BACKEND_URL}`);
    logger_1.logger.info(`📍 Frontend URL: ${env_1.env.FRONTEND_URL}`);
    logger_1.logger.info(`📍 Callback URL: ${env_1.env.GOOGLE_CALLBACK_URL}`);
    logger_1.logger.info(`📍 Healthcheck: ${env_1.env.BACKEND_URL}/api/health`);
    logger_1.logger.info(`📍 OAuth Status: ${env_1.env.BACKEND_URL}/api/auth/google/status`);
    logger_1.logger.info(`--------------------------------------------------`);
    logger_1.logger.info(`🗄️ Database Host: ${dbDiag.host}:${dbDiag.port}`);
    logger_1.logger.info(`🗄️ Database User: ${dbDiag.user}`);
    logger_1.logger.info(`🗄️ Database Name: ${dbDiag.database}`);
    logger_1.logger.info(`--------------------------------------------------`);
    if (diag.configured) {
        logger_1.logger.info(`✓ Google OAuth: CONFIGURED (Client ID Masked: ${diag.clientIdMasked})`);
    }
    else {
        logger_1.logger.warn(`⚠ Google OAuth: NOT CONFIGURED`);
    }
    logger_1.logger.info(`==================================================`);
});
// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
        logger_1.logger.info('Http server closed.');
        await emailWorker.close();
        logger_1.logger.info('BullMQ worker closed.');
        process.exit(0);
    });
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
exports.default = app;
