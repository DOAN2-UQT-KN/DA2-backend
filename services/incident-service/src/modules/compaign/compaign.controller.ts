import { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import {
  HTTP_STATUS,
  sendError,
  sendSuccess,
} from "../../constants/http-status";
import { campaignService } from "./campaign.service";
import { campaignJoiningRequestService } from "./campaign_joining_request/campaign_joining_request.service";
import { JoinRequestStatus } from "../../constants/status.enum";

export class CampaignController {
  constructor() { }

  createCampaign = [
    body("title").notEmpty().withMessage("Title is required").trim(),
    body("description").optional().trim(),
    body("reportIds")
      .optional()
      .isArray()
      .withMessage("reportIds must be an array"),
    body("reportIds.*")
      .optional()
      .isUUID()
      .withMessage("Each reportId must be a valid UUID"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const userId = req.user?.userId;
        if (!userId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        const campaign = await campaignService.createCampaign(userId, req.body);
        sendSuccess(res, HTTP_STATUS.CREATED, { campaign });
      } catch (error) {
        console.error("Create campaign error:", error);
        if (error instanceof Error) {
          if (error.message.includes("reportIds")) {
            return sendError(
              res,
              HTTP_STATUS.BAD_REQUEST.withMessage(error.message),
            );
          }
        }
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  getCampaigns = async (_req: Request, res: Response): Promise<void> => {
    try {
      const campaigns = await campaignService.getCampaigns();
      sendSuccess(res, HTTP_STATUS.OK, { campaigns });
    } catch (error) {
      console.error("Get campaigns error:", error);
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  getCampaignById = [
    param("id").isUUID().withMessage("Campaign ID must be a valid UUID"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const campaign = await campaignService.getCampaignById(req.params.id);
        if (!campaign) {
          return sendError(
            res,
            HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
          );
        }

        sendSuccess(res, HTTP_STATUS.OK, { campaign });
      } catch (error) {
        console.error("Get campaign error:", error);
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  updateCampaign = [
    param("id").isUUID().withMessage("Campaign ID must be a valid UUID"),
    body("title").optional().trim(),
    body("description").optional().trim(),
    body("status").optional().isInt().withMessage("Status must be an integer"),
    body("reportIds")
      .optional()
      .isArray()
      .withMessage("reportIds must be an array"),
    body("reportIds.*")
      .optional()
      .isUUID()
      .withMessage("Each reportId must be a valid UUID"),
    body("managerIds")
      .optional()
      .isArray()
      .withMessage("managerIds must be an array"),
    body("managerIds.*")
      .optional()
      .isUUID()
      .withMessage("Each managerId must be a valid UUID"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const userId = req.user?.userId;
        if (!userId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        const campaign = await campaignService.updateCampaign(
          req.params.id,
          userId,
          req.body,
        );

        sendSuccess(res, HTTP_STATUS.OK, { campaign });
      } catch (error) {
        console.error("Update campaign error:", error);
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            return sendError(
              res,
              HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
            );
          }
          if (
            error.message.includes("Only campaign manager") ||
            error.message.includes("Forbidden")
          ) {
            return sendError(
              res,
              HTTP_STATUS.FORBIDDEN.withMessage(
                "Only campaign manager can modify campaign",
              ),
            );
          }
          if (error.message.includes("reportIds")) {
            return sendError(
              res,
              HTTP_STATUS.BAD_REQUEST.withMessage(error.message),
            );
          }
        }

        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  deleteCampaign = [
    param("id").isUUID().withMessage("Campaign ID must be a valid UUID"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const userId = req.user?.userId;
        if (!userId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        await campaignService.deleteCampaign(req.params.id, userId);

        sendSuccess(
          res,
          HTTP_STATUS.OK.withMessage("Campaign deleted successfully"),
        );
      } catch (error) {
        console.error("Delete campaign error:", error);
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            return sendError(
              res,
              HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
            );
          }
          if (
            error.message.includes("Only campaign manager") ||
            error.message.includes("Forbidden")
          ) {
            return sendError(
              res,
              HTTP_STATUS.FORBIDDEN.withMessage(
                "Only campaign manager can modify campaign",
              ),
            );
          }
        }

        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  // =====================
  // Joining Request Operations
  // =====================

  /**
   * Create a join request for a campaign
   */
  createJoinRequest = [
    body("campaignId").notEmpty().withMessage("Campaign ID is required").trim(),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const volunteerId = req.user?.userId;
        if (!volunteerId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        const joinRequest =
          await campaignJoiningRequestService.createJoinRequest(
            req.body.campaignId,
            volunteerId,
          );
        sendSuccess(res, HTTP_STATUS.CREATED, { joinRequest });
      } catch (error) {
        console.error("Create campaign join request error:", error);
        if (error instanceof Error) {
          if (error.message.includes("Campaign not found")) {
            return sendError(
              res,
              HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
            );
          }
          if (error.message.includes("already exists")) {
            return sendError(
              res,
              HTTP_STATUS.CONFLICT.withMessage("Join request already exists"),
            );
          }
        }
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  /**
   * Get join requests for a campaign (managers only)
   */
  getJoinRequests = [
    body("campaignId").notEmpty().withMessage("Campaign ID is required").trim(),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const joinRequests =
          await campaignJoiningRequestService.getJoinRequestsByCampaignId(
            req.body.campaignId,
          );
        sendSuccess(res, HTTP_STATUS.OK, { joinRequests });
      } catch (error) {
        console.error("Get campaign join requests error:", error);
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  /**
   * Get my join requests (volunteer perspective)
   */
  getMyJoinRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const volunteerId = req.user?.userId;
      if (!volunteerId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const joinRequests =
        await campaignJoiningRequestService.getMyJoinRequests(volunteerId);
      sendSuccess(res, HTTP_STATUS.OK, { joinRequests });
    } catch (error) {
      console.error("Get my join requests error:", error);
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  /**
   * Approve or reject a join request (campaign managers only)
   */
  processJoinRequest = [
    body("requestId").notEmpty().withMessage("Request ID is required").trim(),
    body("approved").isBoolean().withMessage("Approved must be boolean"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const managerId = req.user?.userId;
        if (!managerId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        const status = req.body.approved
          ? JoinRequestStatus._STATUS_APPROVED
          : JoinRequestStatus._STATUS_REJECTED;

        const joinRequest =
          await campaignJoiningRequestService.processJoinRequest(
            req.body.requestId,
            managerId,
            status,
          );
        sendSuccess(res, HTTP_STATUS.OK, { joinRequest });
      } catch (error) {
        console.error("Process join request error:", error);
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            return sendError(res, HTTP_STATUS.NOT_FOUND);
          }
          if (error.message.includes("Only campaign managers")) {
            return sendError(res, HTTP_STATUS.FORBIDDEN);
          }
          if (error.message.includes("already processed")) {
            return sendError(
              res,
              HTTP_STATUS.CONFLICT.withMessage("Join request already processed"),
            );
          }
        }
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  /**
   * Cancel a join request (volunteer only)
   */
  cancelJoinRequest = [
    body("requestId").notEmpty().withMessage("Request ID is required").trim(),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const volunteerId = req.user?.userId;
        if (!volunteerId) {
          return sendError(res, HTTP_STATUS.UNAUTHORIZED);
        }

        await campaignJoiningRequestService.cancelJoinRequest(
          req.body.requestId,
          volunteerId,
        );
        sendSuccess(
          res,
          HTTP_STATUS.OK.withMessage("Join request cancelled successfully"),
        );
      } catch (error) {
        console.error("Cancel join request error:", error);
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            return sendError(res, HTTP_STATUS.NOT_FOUND);
          }
          if (error.message.includes("Cannot cancel")) {
            return sendError(res, HTTP_STATUS.FORBIDDEN);
          }
          if (error.message.includes("only cancel pending")) {
            return sendError(
              res,
              HTTP_STATUS.CONFLICT.withMessage("Can only cancel pending requests"),
            );
          }
        }
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];

  /**
   * Get approved volunteers for a campaign
   */
  getApprovedVolunteers = [
    body("campaignId").notEmpty().withMessage("Campaign ID is required").trim(),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      try {
        const volunteers =
          await campaignJoiningRequestService.getApprovedVolunteers(
            req.body.campaignId,
          );
        sendSuccess(res, HTTP_STATUS.OK, { volunteers });
      } catch (error) {
        console.error("Get approved volunteers error:", error);
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];
}

export const campaignController = new CampaignController();

