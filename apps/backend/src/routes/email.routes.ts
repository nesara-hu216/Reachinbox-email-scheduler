import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// GET /api/emails/stats
router.get('/stats', EmailController.getStats);

// GET /api/emails/senders
router.get('/senders', EmailController.getSenders);

// GET /api/emails/scheduled
router.get('/scheduled', EmailController.getScheduledEmails);

// GET /api/emails/sent
router.get('/sent', EmailController.getSentEmails);

// GET /api/emails/:id
router.get('/:id', EmailController.getEmailById);

export const emailRoutes = router;
