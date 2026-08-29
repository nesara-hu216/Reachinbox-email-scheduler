import { Router } from 'express';
import { CampaignController, createCampaignSchema } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

router.use(requireAuth);

// POST /api/campaigns
router.post('/', validateRequest(createCampaignSchema), CampaignController.createCampaign);

// GET /api/campaigns
router.get('/', CampaignController.getCampaigns);

// GET /api/campaigns/:id
router.get('/:id', CampaignController.getCampaignById);

export const campaignRoutes = router;
