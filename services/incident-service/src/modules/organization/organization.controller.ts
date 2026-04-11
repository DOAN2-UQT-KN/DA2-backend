import { Request, Response } from "express";
import {
  body,
  param,
  query,
  validationResult,
} from "express-validator";
import {
  HTTP_STATUS,
  sendError,
  sendHttpErrorResponse,
  sendSuccess,
} from "../../constants/http-status";
import { JoinRequestStatus } from "../../constants/status.enum";
import type {
  CreateOrganizationBody,
  GetOrganizationJoinRequestsQuery,
  MyOrganizationJoinRequestsQuery,
  OrganizationListQuery,
  OrganizationMembersListQuery,
} from "./organization.dto";
import { organizationService } from "./organization.service";

const orgIdParam = param("id").isUUID().withMessage("id must be a valid UUID");

export class OrganizationController {
  createOrganization = [
    body("name")
      .notEmpty()
      .trim()
      .isLength({ max: 200 })
      .withMessage("name is required (max 200 characters)"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("description too long"),
    body("logoUrl")
      .notEmpty()
      .trim()
      .isLength({ max: 2048 })
      .isURL({ require_tld: false })
      .withMessage("logo_url must be a non-empty valid URL (max 2048 characters)"),
    body("contactEmail")
      .notEmpty()
      .trim()
      .isLength({ max: 320 })
      .isEmail()
      .withMessage("contact_email is required and must be a valid email"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
        const body = req.body as CreateOrganizationBody;
        const organization = await organizationService.createOrganization(
          userId,
          body,
        );
        return sendSuccess(res, HTTP_STATUS.CREATED, { organization });
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  listOrganizations = [
    query("search").optional().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt", "name"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      if (!req.user?.userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const q: OrganizationListQuery = {
        search: req.query.search
          ? String(req.query.search).trim()
          : undefined,
        page: req.query.page
          ? parseInt(String(req.query.page), 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(String(req.query.limit), 10)
          : undefined,
        sortBy: req.query.sortBy as OrganizationListQuery["sortBy"],
        sortOrder: req.query.sortOrder as OrganizationListQuery["sortOrder"],
      };

      try {
        const result = await organizationService.listOrganizations(q);
        return sendSuccess(res, HTTP_STATUS.OK, result);
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  listMyOrganizations = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED);
    }

    try {
      const organizations =
        await organizationService.listOwnedByUser(userId);
      return sendSuccess(res, HTTP_STATUS.OK, { organizations });
    } catch (error) {
      if (sendHttpErrorResponse(res, error)) {
        return;
      }
      throw error;
    }
  };

  /**
   * Approve an organization (admin only). Sets status to active (`GlobalStatus._STATUS_ACTIVE`).
   */
  adminVerifyOrganization = [
    orgIdParam,

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const role = req.user?.role;
      const normalizedRole = role?.toLowerCase();
      if (!normalizedRole || normalizedRole !== "admin") {
        return sendError(
          res,
          HTTP_STATUS.FORBIDDEN.withMessage(
            "Only admin can verify an organization",
          ),
        );
      }

      try {
        const organization = await organizationService.adminVerifyOrganization(
          req.params.id,
          userId,
        );
        return sendSuccess(
          res,
          HTTP_STATUS.OK.withMessage("Organization approved successfully"),
          { organization },
        );
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  getOrganizationById = [
    orgIdParam,

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      if (!req.user?.userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
        const organization = await organizationService.getById(req.params.id);
        if (!organization) {
          return sendError(res, HTTP_STATUS.NOT_FOUND);
        }
        return sendSuccess(res, HTTP_STATUS.OK, { organization });
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  createJoinRequest = [
    orgIdParam,

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
        const joinRequest = await organizationService.createJoinRequest(
          req.params.id,
          userId,
        );
        return sendSuccess(res, HTTP_STATUS.CREATED, { joinRequest });
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  listJoinRequestsForOwner = [
    orgIdParam,
    query("status").optional().isInt(),
    query("requesterId").optional().isUUID(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const q: GetOrganizationJoinRequestsQuery = {
        status:
          req.query.status !== undefined && req.query.status !== ""
            ? parseInt(String(req.query.status), 10)
            : undefined,
        requesterId: req.query.requesterId
          ? String(req.query.requesterId).trim()
          : undefined,
        page: req.query.page
          ? parseInt(String(req.query.page), 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(String(req.query.limit), 10)
          : undefined,
        sortBy: req.query.sortBy as GetOrganizationJoinRequestsQuery["sortBy"],
        sortOrder:
          req.query.sortOrder as GetOrganizationJoinRequestsQuery["sortOrder"],
      };

      try {
        const result = await organizationService.listJoinRequestsForOwner(
          req.params.id,
          userId,
          q,
        );
        return sendSuccess(res, HTTP_STATUS.OK, result);
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  getMyJoinRequests = [
    query("organizationId").optional().isUUID(),
    query("status").optional().isInt(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const q: MyOrganizationJoinRequestsQuery = {
        organizationId: req.query.organizationId
          ? String(req.query.organizationId).trim()
          : undefined,
        status:
          req.query.status !== undefined && req.query.status !== ""
            ? parseInt(String(req.query.status), 10)
            : undefined,
        page: req.query.page
          ? parseInt(String(req.query.page), 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(String(req.query.limit), 10)
          : undefined,
        sortBy: req.query.sortBy as MyOrganizationJoinRequestsQuery["sortBy"],
        sortOrder:
          req.query.sortOrder as MyOrganizationJoinRequestsQuery["sortOrder"],
      };

      try {
        const result = await organizationService.getMyJoinRequests(userId, q);
        return sendSuccess(res, HTTP_STATUS.OK, result);
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  processJoinRequest = [
    body("requestId").isUUID().withMessage("requestId must be a valid UUID"),
    body("approved").isBoolean().withMessage("approved must be boolean"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const status = req.body.approved
        ? JoinRequestStatus._STATUS_APPROVED
        : JoinRequestStatus._STATUS_REJECTED;

      try {
        const joinRequest = await organizationService.processJoinRequest(
          req.body.requestId,
          userId,
          status,
        );
        return sendSuccess(res, HTTP_STATUS.OK, { joinRequest });
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  cancelJoinRequest = [
    body("requestId").isUUID().withMessage("requestId must be a valid UUID"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      try {
        await organizationService.cancelJoinRequest(
          req.body.requestId,
          userId,
        );
        return sendSuccess(res, HTTP_STATUS.OK);
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];

  listMembers = [
    orgIdParam,
    query("userId").optional().isUUID(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["createdAt", "updatedAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
          errors: errors.array(),
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, HTTP_STATUS.UNAUTHORIZED);
      }

      const q: OrganizationMembersListQuery = {
        userId: req.query.userId
          ? String(req.query.userId).trim()
          : undefined,
        page: req.query.page
          ? parseInt(String(req.query.page), 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(String(req.query.limit), 10)
          : undefined,
        sortBy: req.query.sortBy as OrganizationMembersListQuery["sortBy"],
        sortOrder:
          req.query.sortOrder as OrganizationMembersListQuery["sortOrder"],
      };

      try {
        const result = await organizationService.listMembersForOwner(
          req.params.id,
          userId,
          q,
        );
        return sendSuccess(res, HTTP_STATUS.OK, result);
      } catch (error) {
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        throw error;
      }
    },
  ];
}

export const organizationController = new OrganizationController();
