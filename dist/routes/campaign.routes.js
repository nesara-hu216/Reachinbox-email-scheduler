"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignRoutes = void 0;
const express_1 = require("express");
const campaign_controller_1 = require("../controllers/campaign.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// POST /api/campaigns
router.post('/', (0, validate_middleware_1.validateRequest)(campaign_controller_1.createCampaignSchema), campaign_controller_1.CampaignController.createCampaign);
// GET /api/campaigns
router.get('/', campaign_controller_1.CampaignController.getCampaigns);
// GET /api/campaigns/:id
router.get('/:id', campaign_controller_1.CampaignController.getCampaignById);
exports.campaignRoutes = router;
