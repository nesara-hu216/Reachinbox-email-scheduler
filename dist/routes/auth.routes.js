"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// Diagnostic Status Endpoint: GET /api/auth/google/status
router.get('/google/status', auth_controller_1.AuthController.getOAuthStatus);
// GET /api/auth/google -> Initiates standard Google OAuth 2.0 Browser Redirect
router.get('/google', (req, res, next) => {
    const diag = (0, env_1.getGoogleOAuthDiagnosticInfo)();
    if (!diag.clientIdPresent || !diag.isValidFormat) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'OAUTH_NOT_CONFIGURED',
                message: 'Google OAuth Client ID is invalid or missing in backend/.env. Please set a valid Web Application GOOGLE_CLIENT_ID (ending in .apps.googleusercontent.com) and GOOGLE_CLIENT_SECRET in apps/backend/.env and restart the server.',
                diagnostic: diag,
            },
        });
    }
    passport_1.default.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
// GET /api/auth/google/callback
router.get('/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/?error=auth_failed' }), auth_controller_1.AuthController.handleOAuthCallback);
// GET /api/auth/me
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.AuthController.getMe);
// POST /api/auth/logout
router.post('/logout', auth_controller_1.AuthController.logout);
// POST /api/auth/dev-login
router.post('/dev-login', auth_controller_1.AuthController.devLogin);
exports.authRoutes = router;
