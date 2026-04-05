import { Router } from "express";
import { param, validationResult } from "express-validator";
import { HTTP_STATUS, sendError, sendSuccess } from "../constants/http-status";
import { requireInternalRewardApiKey } from "../middleware/internal-reward-auth.middleware";
import { difficultyService } from "../modules/difficulty/difficulty.service";

const router = Router();

router.use(requireInternalRewardApiKey);

router.get("/difficulties", async (_req, res): Promise<void> => {
  try {
    const difficulties = await difficultyService.listActive();
    sendSuccess(res, HTTP_STATUS.OK, { difficulties });
  } catch (error) {
    console.error("List difficulties error:", error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

router.get(
  "/difficulties/level/:level",
  param("level").isInt({ min: 1 }).withMessage("level must be a positive integer"),

  async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, HTTP_STATUS.VALIDATION_ERROR, {
        errors: errors.array(),
      });
      return;
    }

    try {
      const levelStr = req.params?.level;
      if (!levelStr) {
        sendError(
          res,
          HTTP_STATUS.BAD_REQUEST.withMessage("Missing level"),
        );
        return;
      }
      const level = parseInt(levelStr, 10);
      const difficulty = await difficultyService.findByLevel(level);
      if (!difficulty) {
        sendError(
          res,
          HTTP_STATUS.NOT_FOUND.withMessage("Difficulty not found"),
        );
        return;
      }
      sendSuccess(res, HTTP_STATUS.OK, { difficulty });
    } catch (error) {
      console.error("Get difficulty by level error:", error);
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  },
);

export default router;
