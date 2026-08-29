import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { env, isGoogleOauthConfigured, getGoogleOAuthDiagnosticInfo, getDatabaseDiagnosticInfo } from './config/env';
import { logger } from './utils/logger';
import { setupPassport } from './config/passport';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { campaignRoutes } from './routes/campaign.routes';
import { emailRoutes } from './routes/email.routes';
import { healthRoutes } from './routes/health.routes';
import { initializeEmailWorker } from './workers/email.worker';

const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Dynamically allow requests from deployed cloud domains and local environment
      if (
        !origin ||
        origin === env.FRONTEND_URL ||
        origin.includes('railway.app') ||
        origin.includes('vercel.app') ||
        origin.includes('onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Enable trust proxy for reverse proxies (Render, Railway, Cloudflare, etc.)
app.set('trust proxy', 1);

// Express Session configuration for Passport
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Initialize Passport
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    logger.info({ method: req.method, path: req.path }, 'Incoming Request');
  }
  next();
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ReachInbox Email Scheduler Engine API',
    status: 'healthy',
    documentation: 'https://github.com/nesara-hu216/reachinbox-email-scheduler',
    healthcheck: '/api/health',
  });
});

import { workerRoutes } from './routes/worker.routes';

// API Routes & Aliases (supports both /api/path and /path under serverless rewrites)
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/campaigns', campaignRoutes);
app.use('/campaigns', campaignRoutes);

app.use('/api/emails', emailRoutes);
app.use('/emails', emailRoutes);

app.use('/api/worker', workerRoutes);
app.use('/worker', workerRoutes);

// Centralized error middleware
app.use(errorHandler);

// Initialize BullMQ Worker asynchronously (so Express HTTP server binds port instantly without waiting for Redis)
let emailWorker: any = null;
if (process.env.VERCEL !== '1') {
  setImmediate(() => {
    try {
      emailWorker = initializeEmailWorker();
    } catch (err: any) {
      logger.warn({ err: err?.message }, '⚠️ Deferred worker initialization warning');
    }
  });
}

// Start Express Server (only when running as standalone Node process)
if (process.env.VERCEL !== '1') {
  const listenPort = process.env.PORT ? parseInt(process.env.PORT, 10) : env.PORT || 4000;
  const server = app.listen(listenPort, '0.0.0.0', () => {
    const diag = getGoogleOAuthDiagnosticInfo();
    const dbDiag = getDatabaseDiagnosticInfo();

    logger.info(`==================================================`);
    logger.info(`🚀 ReachInbox Backend Server running on port ${listenPort} (0.0.0.0)`);
    logger.info(`📍 Server URL: ${env.BACKEND_URL}`);
    logger.info(`📍 Frontend URL: ${env.FRONTEND_URL}`);
    logger.info(`📍 Callback URL: ${env.GOOGLE_CALLBACK_URL}`);
    logger.info(`📍 Healthcheck: ${env.BACKEND_URL}/api/health`);
    logger.info(`📍 OAuth Status: ${env.BACKEND_URL}/api/auth/google/status`);
    logger.info(`--------------------------------------------------`);
    logger.info(`🗄️ Database Host: ${dbDiag.host}:${dbDiag.port}`);
    logger.info(`🗄️ Database User: ${dbDiag.user}`);
    logger.info(`🗄️ Database Name: ${dbDiag.database}`);
    logger.info(`--------------------------------------------------`);

    if (diag.configured) {
      logger.info(`✓ Google OAuth: CONFIGURED (Client ID Masked: ${diag.clientIdMasked})`);
    } else {
      logger.warn(`⚠ Google OAuth: NOT CONFIGURED`);
    }
    logger.info(`==================================================`);
  });

  // Render official proxy keep-alive timeout configuration (prevents 502 Bad Gateway socket drops)
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120500;

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('Http server closed.');
      if (emailWorker) await emailWorker.close();
      logger.info('BullMQ worker closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

export default app;
