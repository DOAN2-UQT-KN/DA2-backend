import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireInternalApiKey } from "../../middleware/internal-auth.middleware";
import {
  enqueueNotificationValidators,
  listMineValidators,
  markReadValidators,
  notificationController,
} from "./notification.controller";

const router = Router();

/**
 * @route   POST /api/v1/notifications/jobs
 * @desc    Enqueue a notification job (email or website). Processed asynchronously by the worker.
 * @access  Internal API key
 */
router.post(
  "/jobs",
  requireInternalApiKey,
  ...enqueueNotificationValidators,
  notificationController.enqueue,
);

/**
 * @route   GET /api/v1/notifications/my
 * @desc    List current user's in-app (website) notifications
 * @access  Private
 */
router.get(
  "/my",
  authenticate,
  ...listMineValidators,
  notificationController.listMine,
);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark an in-app notification as read
 * @access  Private
 */
router.patch(
  "/:id/read",
  authenticate,
  ...markReadValidators,
  notificationController.markRead,
);

export default router;
