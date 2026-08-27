import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load environment variables reliably regardless of cwd
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/backend/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

let envFileLoaded = 'process.env';
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    envFileLoaded = envPath;
    break;
  }
}

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000').transform((v) => v.trim()),
  BACKEND_URL: z.string().default('http://localhost:4000').transform((v) => v.trim()),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z.string().default('reachinbox-dev-session-secret-key-min-32-chars'),
  JWT_SECRET: z.string().default('reachinbox-dev-jwt-secret-key-min-32-chars'),
  GOOGLE_CLIENT_ID: z.string().optional().default('').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  GOOGLE_CLIENT_SECRET: z.string().optional().default('').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback').transform((v) => v.trim()),
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().default('587').transform((v) => parseInt(v, 10)),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  WORKER_CONCURRENCY: z.string().default('5').transform((v) => parseInt(v, 10)),
  MIN_SEND_DELAY_MS: z.string().default('2000').transform((v) => parseInt(v, 10)),
  MAX_EMAILS_PER_HOUR: z.string().default('200').transform((v) => parseInt(v, 10)),
});

export const env = envSchema.parse(process.env);

// Strict regex pattern for Google OAuth Web Client IDs
export const GOOGLE_CLIENT_ID_REGEX = /^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;

export function isGoogleOauthConfigured(): boolean {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
      GOOGLE_CLIENT_ID_REGEX.test(env.GOOGLE_CLIENT_ID) &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_CLIENT_SECRET.trim().length > 10
  );
}

export function getGoogleOAuthDiagnosticInfo() {
  const rawId = env.GOOGLE_CLIENT_ID || '';
  const rawSecret = env.GOOGLE_CLIENT_SECRET || '';
  const isValidFormat = GOOGLE_CLIENT_ID_REGEX.test(rawId);
  const isConfigured = isGoogleOauthConfigured();

  let clientIdMasked = 'Not set';
  if (rawId.length > 15) {
    const start = rawId.slice(0, 8);
    const end = rawId.slice(-24);
    clientIdMasked = `${start}...${end}`;
  } else if (rawId.length > 0) {
    clientIdMasked = `${rawId.slice(0, 4)}...`;
  }

  return {
    configured: isConfigured,
    envFileLoaded,
    clientIdPresent: Boolean(rawId),
    clientIdMasked,
    isValidFormat,
    clientSecretPresent: Boolean(rawSecret),
    clientSecretLength: rawSecret.length,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  };
}

export function getDatabaseDiagnosticInfo() {
  try {
    const parsed = new URL(env.DATABASE_URL);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port || '5432',
      user: parsed.username || 'postgres',
      database: parsed.pathname.replace(/^\//, '') || 'reachinbox_email_scheduler',
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: '5432',
      user: 'postgres',
      database: 'reachinbox_email_scheduler',
    };
  }
}
