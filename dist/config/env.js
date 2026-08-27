"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CLIENT_ID_REGEX = exports.env = void 0;
exports.isGoogleOauthConfigured = isGoogleOauthConfigured;
exports.getGoogleOAuthDiagnosticInfo = getGoogleOAuthDiagnosticInfo;
exports.getDatabaseDiagnosticInfo = getDatabaseDiagnosticInfo;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const zod_1 = require("zod");
// Load environment variables reliably regardless of cwd
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(process.cwd(), 'apps/backend/.env'),
    path_1.default.resolve(__dirname, '../../.env'),
    path_1.default.resolve(__dirname, '../../../.env'),
];
let envFileLoaded = 'process.env';
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath, override: true });
        envFileLoaded = envPath;
        break;
    }
}
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('4000').transform((v) => parseInt(v, 10)),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000').transform((v) => v.trim()),
    BACKEND_URL: zod_1.z.string().default('http://localhost:4000').transform((v) => v.trim()),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    SESSION_SECRET: zod_1.z.string().default('reachinbox-dev-session-secret-key-min-32-chars'),
    JWT_SECRET: zod_1.z.string().default('reachinbox-dev-jwt-secret-key-min-32-chars'),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional().default('').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional().default('').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
    GOOGLE_CALLBACK_URL: zod_1.z.string().default('http://localhost:4000/api/auth/google/callback').transform((v) => v.trim()),
    SMTP_HOST: zod_1.z.string().default('smtp.ethereal.email'),
    SMTP_PORT: zod_1.z.string().default('587').transform((v) => parseInt(v, 10)),
    SMTP_USER: zod_1.z.string().optional().default(''),
    SMTP_PASSWORD: zod_1.z.string().optional().default(''),
    WORKER_CONCURRENCY: zod_1.z.string().default('5').transform((v) => parseInt(v, 10)),
    MIN_SEND_DELAY_MS: zod_1.z.string().default('2000').transform((v) => parseInt(v, 10)),
    MAX_EMAILS_PER_HOUR: zod_1.z.string().default('200').transform((v) => parseInt(v, 10)),
});
exports.env = envSchema.parse(process.env);
// Strict regex pattern for Google OAuth Web Client IDs
exports.GOOGLE_CLIENT_ID_REGEX = /^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
function isGoogleOauthConfigured() {
    return Boolean(exports.env.GOOGLE_CLIENT_ID &&
        exports.GOOGLE_CLIENT_ID_REGEX.test(exports.env.GOOGLE_CLIENT_ID) &&
        exports.env.GOOGLE_CLIENT_SECRET &&
        exports.env.GOOGLE_CLIENT_SECRET.trim().length > 10);
}
function getGoogleOAuthDiagnosticInfo() {
    const rawId = exports.env.GOOGLE_CLIENT_ID || '';
    const rawSecret = exports.env.GOOGLE_CLIENT_SECRET || '';
    const isValidFormat = exports.GOOGLE_CLIENT_ID_REGEX.test(rawId);
    const isConfigured = isGoogleOauthConfigured();
    let clientIdMasked = 'Not set';
    if (rawId.length > 15) {
        const start = rawId.slice(0, 8);
        const end = rawId.slice(-24);
        clientIdMasked = `${start}...${end}`;
    }
    else if (rawId.length > 0) {
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
        callbackUrl: exports.env.GOOGLE_CALLBACK_URL,
    };
}
function getDatabaseDiagnosticInfo() {
    try {
        const parsed = new URL(exports.env.DATABASE_URL);
        return {
            host: parsed.hostname || 'localhost',
            port: parsed.port || '5432',
            user: parsed.username || 'postgres',
            database: parsed.pathname.replace(/^\//, '') || 'reachinbox_email_scheduler',
        };
    }
    catch (e) {
        return {
            host: 'localhost',
            port: '5432',
            user: 'postgres',
            database: 'reachinbox_email_scheduler',
        };
    }
}
