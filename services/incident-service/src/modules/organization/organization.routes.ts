import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { organizationController } from "./organization.controller";

const router = Router();

/**
 * @route   POST /api/v1/organizations
 * @desc    Create an organization; current user becomes the sole owner.
 * @access  Private
 */
router.post("/", authenticate, organizationController.createOrganization);

/**
 * @route   GET /api/v1/organizations/join-requests/my
 * @desc    Join requests I submitted (with organization summary).
 * @access  Private
 */
router.get(
  "/join-requests/my",
  authenticate,
  organizationController.getMyJoinRequests,
);

/**
 * @route   PUT /api/v1/organizations/join-requests/process
 * @desc    Approve or reject a join request (organization owner only).
 * @access  Private
 * @body    { requestId, approved }
 */
router.put(
  "/join-requests/process",
  authenticate,
  organizationController.processJoinRequest,
);

/**
 * @route   DELETE /api/v1/organizations/join-requests/cancel
 * @desc    Cancel my pending join request.
 * @access  Private
 * @body    { requestId }
 */
router.delete(
  "/join-requests/cancel",
  authenticate,
  organizationController.cancelJoinRequest,
);

/**
 * @route   GET /api/v1/organizations/owned
 * @desc    Organizations where I am the owner.
 * @access  Private
 */
router.get(
  "/owned",
  authenticate,
  organizationController.listMyOrganizations,
);

/**
 * @route   GET /api/v1/organizations
 * @desc    List organizations (search + pagination).
 * @access  Private
 */
router.get("/", authenticate, organizationController.listOrganizations);

/**
 * @route   GET /api/v1/organizations/:id
 * @desc    Organization by id.
 * @access  Private
 */
router.get("/:id", authenticate, organizationController.getOrganizationById);

/**
 * @route   POST /api/v1/organizations/:id/join-requests
 * @desc    Request to join an organization.
 * @access  Private
 */
router.post(
  "/:id/join-requests",
  authenticate,
  organizationController.createJoinRequest,
);

/**
 * @route   GET /api/v1/organizations/:id/join-requests
 * @desc    List join requests for an organization (owner only).
 * @access  Private
 */
router.get(
  "/:id/join-requests",
  authenticate,
  organizationController.listJoinRequestsForOwner,
);

/**
 * @route   GET /api/v1/organizations/:id/members
 * @desc    List approved members (owner only; owner is not in this list).
 * @access  Private
 */
router.get(
  "/:id/members",
  authenticate,
  organizationController.listMembers,
);

export default router;
