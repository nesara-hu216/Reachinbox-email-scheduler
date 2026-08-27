"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPassport = setupPassport;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
function setupPassport() {
    passport_1.default.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport_1.default.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    });
    const diag = (0, env_1.getGoogleOAuthDiagnosticInfo)();
    if (diag.configured) {
        logger_1.logger.info({ clientIdMasked: diag.clientIdMasked, callbackUrl: diag.callbackUrl }, '🔑 Configuring Passport Google OAuth 2.0 Strategy');
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: env_1.env.GOOGLE_CLIENT_ID,
            clientSecret: env_1.env.GOOGLE_CLIENT_SECRET,
            callbackURL: env_1.env.GOOGLE_CALLBACK_URL,
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails?.[0]?.value || `${googleId}@gmail.com`;
                const name = profile.displayName || 'Google User';
                const avatarUrl = profile.photos?.[0]?.value || null;
                const user = await prisma.user.upsert({
                    where: { email },
                    update: {
                        googleId,
                        name,
                        avatarUrl,
                    },
                    create: {
                        googleId,
                        email,
                        name,
                        avatarUrl,
                    },
                });
                return done(null, user);
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Error during Google OAuth callback processing');
                return done(err, undefined);
            }
        }));
    }
    else {
        logger_1.logger.warn({ clientIdMasked: diag.clientIdMasked, isValidFormat: diag.isValidFormat }, '⚠️ Google OAuth is not configured with a valid Google Web Application Client ID (.apps.googleusercontent.com).');
    }
}
