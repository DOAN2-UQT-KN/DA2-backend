import { Router } from "express";
import { param, validationResult } from "express-validator";
import { HTTP_STATUS, sendError, sendSuccess } from "../constants/http-status";
import { requireInternalIdentityApiKey } from "../middleware/internal-identity-auth.middleware";
import { userService } from "../modules/user/user.service";

const router = Router();

router.use(requireInternalIdentityApiKey);

router.get(
  "/users/:id/email",
  param("id").isUUID(),
  async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, HTTP_STATUS.VALIDATION_ERROR, { errors: errors.array() });
      return;
    }

    try {
      const userId = req.params?.id;
      if (!userId) {
        sendError(res, HTTP_STATUS.BAD_REQUEST.withMessage("Missing user id"));
        return;
      }
      const email = await userService.getUserEmailById(userId);
      if (!email) {
        sendError(res, HTTP_STATUS.NOT_FOUND.withMessage("User not found"));
        return;
      }
      sendSuccess(res, HTTP_STATUS.OK, { email });
    } catch (error) {
      console.error("Internal user email error:", error);
      sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  },
);

export default router;
