"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailRoutes = void 0;
const express_1 = require("express");
const email_controller_1 = require("../controllers/email.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// GET /api/emails/stats
router.get('/stats', email_controller_1.EmailController.getStats);
// GET /api/emails/senders
router.get('/senders', email_controller_1.EmailController.getSenders);
// GET /api/emails/scheduled
router.get('/scheduled', email_controller_1.EmailController.getScheduledEmails);
// GET /api/emails/sent
router.get('/sent', email_controller_1.EmailController.getSentEmails);
// GET /api/emails/:id
router.get('/:id', email_controller_1.EmailController.getEmailById);
exports.emailRoutes = router;
