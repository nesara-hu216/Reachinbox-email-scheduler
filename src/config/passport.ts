import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { env, isGoogleOauthConfigured, getGoogleOAuthDiagnosticInfo } from './env';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export function setupPassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  const diag = getGoogleOAuthDiagnosticInfo();

  if (diag.configured) {
    logger.info(
      { clientIdMasked: diag.clientIdMasked, callbackUrl: diag.callbackUrl },
      '🔑 Configuring Passport Google OAuth 2.0 Strategy'
    );

    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
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
          } catch (err) {
            logger.error({ err }, 'Error during Google OAuth callback processing');
            return done(err as Error, undefined);
          }
        }
      )
    );
  } else {
    logger.warn(
      { clientIdMasked: diag.clientIdMasked, isValidFormat: diag.isValidFormat },
      '⚠️ Google OAuth is not configured with a valid Google Web Application Client ID (.apps.googleusercontent.com).'
    );
  }
}
