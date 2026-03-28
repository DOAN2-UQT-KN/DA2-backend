import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { campaignController } from "./campaign.controller";

const router = Router();

/**
 * @route   POST /api/v1/campaigns
 * @desc    Create a new campaign and optionally link reports
 * @access  Private
 */
router.post("/", authenticate, campaignController.createCampaign);

/**
 * @route   GET /api/v1/campaigns
 * @desc    Get all campaigns
 * @access  Private
 */
router.get("/", authenticate, campaignController.getCampaigns);

/**
 * @route   GET /api/v1/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private
 */
router.get("/:id", authenticate, campaignController.getCampaignById);

/**
 * @route   PUT /api/v1/campaigns/:id
 * @desc    Update campaign by ID
 * @access  Private (Campaign manager only)
 */
router.put("/:id", authenticate, campaignController.updateCampaign);

/**
 * @route   DELETE /api/v1/campaigns/:id
 * @desc    Soft delete campaign by ID
 * @access  Private (Campaign manager only)
 */
router.delete("/:id", authenticate, campaignController.deleteCampaign);

// =====================
// Joining Request Routes
// =====================

/**
 * @route   POST /api/v1/campaigns/volunteers/join-requests
 * @desc    Create a join request for a campaign
 * @access  Private
 * @body    { campaignId }
 */
router.post(
    "/volunteers/join-requests",
    authenticate,
    campaignController.createJoinRequest,
);

/**
 * @route   POST /api/v1/campaigns/volunteers/join-requests/get
 * @desc    Get join requests for a campaign (managers only)
 * @access  Private
 * @body    { campaignId }
 */
router.post(
    "/volunteers/join-requests/get",
    authenticate,
    campaignController.getJoinRequests,
);

/**
 * @route   GET /api/v1/campaigns/volunteers/join-requests/my
 * @desc    Get my join requests as a volunteer
 * @access  Private
 */
router.get(
    "/volunteers/join-requests/my",
    authenticate,
    campaignController.getMyJoinRequests,
);

/**
 * @route   PUT /api/v1/campaigns/volunteers/join-requests/process
 * @desc    Approve or reject a join request (campaign managers only)
 * @access  Private
 * @body    { requestId, approved }
 */
router.put(
    "/volunteers/join-requests/process",
    authenticate,
    campaignController.processJoinRequest,
);

/**
 * @route   DELETE /api/v1/campaigns/volunteers/join-requests/cancel
 * @desc    Cancel a join request (volunteer only)
 * @access  Private
 * @body    { requestId }
 */
router.delete(
    "/volunteers/join-requests/cancel",
    authenticate,
    campaignController.cancelJoinRequest,
);

/**
 * @route   POST /api/v1/campaigns/volunteers/approved
 * @desc    Get approved volunteers for a campaign
 * @access  Private
 * @body    { campaignId }
 */
router.post(
    "/volunteers/approved",
    authenticate,
    campaignController.getApprovedVolunteers,
);

export default router;

