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

import { campaignSubmissionController } from "./campaign_submission/campaign_submission.controller";

// =====================
// Submission Routes
// =====================

/**
 * @route   POST /api/v1/campaigns/:id/submissions
 * @desc    Create a submission (title, description in body); attach draft results from the DB
 * @access  Private (Campaign manager only)
 */
router.post(
  "/:id/submissions",
  authenticate,
  campaignSubmissionController.createSubmission,
);

/**
 * @route   GET /api/v1/campaigns/:id/submissions
 * @desc    Get all submissions for a campaign
 * @access  Private
 */
router.get(
  "/:id/submissions",
  authenticate,
  campaignSubmissionController.getSubmissions,
);

/**
 * @route   GET /api/v1/campaigns/:id/submissions/current-results
 * @desc    Draft results for this campaign (not yet submitted / no submission id)
 * @access  Private
 */
router.get(
  "/:id/submissions/current-results",
  authenticate,
  campaignSubmissionController.getCurrentResults,
);

/**
 * @route   GET /api/v1/campaigns/submissions/:submissionId
 * @desc    Get submission detail (with all results and files)
 * @access  Private
 */
router.get(
  "/submissions/:submissionId",
  authenticate,
  campaignSubmissionController.getSubmissionDetail,
);

/**
 * @route   POST /api/v1/campaigns/submissions/:submissionId/results
 * @desc    Add a result to an existing submission
 * @access  Private (Submitter only)
 */
router.post(
  "/submissions/:submissionId/results",
  authenticate,
  campaignSubmissionController.addResult,
);

/**
 * @route   PUT /api/v1/campaigns/submissions/:submissionId/process
 * @desc    Approve or reject a submission
 * @access  Private (Campaign manager only)
 * @body    { approved }
 */
router.put(
  "/submissions/:submissionId/process",
  authenticate,
  campaignSubmissionController.processSubmission,
);

export default router;
