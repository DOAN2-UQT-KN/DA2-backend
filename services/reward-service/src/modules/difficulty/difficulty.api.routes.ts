import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { HTTP_STATUS, sendError, sendSuccess } from "../../constants/http-status";
import { authenticate } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/require-admin.middleware";
import { difficultyService } from "./difficulty.service";

const router = Router();

/**
 * @route   GET /api/v1/difficulties
 * @desc    List active campaign difficulty tiers (volunteer caps, green points)
 * @access  Public
 */
router.get("/difficulties", async (_req, res): Promise<void> => {
  try {
    const difficulties = await difficultyService.listActive();
    sendSuccess(res, HTTP_STATUS.OK, { difficulties });
  } catch (error) {
    console.error("List difficulties error:", error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * @route   PUT /api/v1/difficulties/:id
 * @desc    Update a difficulty tier
 * @access  Private (Admin only)
 */
router.put(
  "/difficulties/:id",
  authenticate,
  requireAdmin,
  param("id").isUUID().withMessage("id must be a UUID"),
  body("name").optional().trim().isLength({ min: 1, max: 64 }),
  body("maxVolunteers")
    .optional({ values: "null" })
    .custom((v) => v === null || (Number.isInteger(v) && v >= 1))
    .withMessage("maxVolunteers must be null or an integer >= 1"),
  body("greenPoints")
    .optional()
    .isInt({ min: 0 })
    .withMessage("greenPoints must be an integer >= 0"),

  async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
        errors: errors.array(),
      });
      return;
    }

    try {
      const id = req.params?.id;
      if (!id) {
        sendError(res, HTTP_STATUS.BAD_REQUEST.withMessage("Missing id"));
        return;
      }
      const updated = await difficultyService.updateById(id, {
        name: req.body.name,
        maxVolunteers:
          req.body.maxVolunteers === undefined
            ? undefined
            : req.body.maxVolunteers,
        greenPoints: req.body.greenPoints,
      });
      if (!updated) {
        sendError(res, HTTP_STATUS.NOT_FOUND);
        return;
      }
      sendSuccess(res, HTTP_STATUS.OK, { difficulty: updated });
    } catch (error) {
      console.error("Update difficulty error:", error);
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  },
);

export default router;
