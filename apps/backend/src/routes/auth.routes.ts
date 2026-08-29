import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { env, isGoogleOauthConfigured, getGoogleOAuthDiagnosticInfo } from '../config/env';

const router = Router();

// Diagnostic Status Endpoint: GET /api/auth/google/status
router.get('/google/status', AuthController.getOAuthStatus);

// GET /api/auth/google -> Initiates standard Google OAuth 2.0 Browser Redirect
router.get('/google', (req, res, next) => {
  const diag = getGoogleOAuthDiagnosticInfo();

  if (!diag.clientIdPresent || !diag.isValidFormat) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'OAUTH_NOT_CONFIGURED',
        message:
          'Google OAuth Client ID is invalid or missing in backend/.env. Please set a valid Web Application GOOGLE_CLIENT_ID (ending in .apps.googleusercontent.com) and GOOGLE_CLIENT_SECRET in apps/backend/.env and restart the server.',
        diagnostic: diag,
      },
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  AuthController.handleOAuthCallback
);

// GET /api/auth/me
router.get('/me', requireAuth, AuthController.getMe);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

// POST /api/auth/dev-login
router.post('/dev-login', AuthController.devLogin);

export const authRoutes = router;
