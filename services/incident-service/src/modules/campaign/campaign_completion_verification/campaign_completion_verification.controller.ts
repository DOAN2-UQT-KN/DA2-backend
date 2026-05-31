import { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import {
  HTTP_STATUS,
  sendError,
  sendHttpErrorResponse,
  sendSuccess,
} from "../../../constants/http-status";
import { campaignCompletionVerificationService } from "./campaign_completion_verification.service";

export class CampaignCompletionVerificationController {
  submit = [
    param("id").isUUID().withMessage("Campaign id must be a valid UUID"),
    body("value")
      .isInt({ min: -1, max: 1 })
      .custom((v) => v === 1 || v === -1)
      .withMessage("value must be 1 (clean) or -1 (not clean)"),

    async (req: Request, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, HTTP_STATUS.VALIDATION_ERROR, { errors: errors.array() });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      try {
        const result = await campaignCompletionVerificationService.submit(
          userId,
          req.params.id,
          req.body.value as 1 | -1,
        );
        sendSuccess(res, HTTP_STATUS.OK, {
          completionVerification: result,
        });
      } catch (error) {
        console.error("Submit campaign completion verification error:", error);
        if (sendHttpErrorResponse(res, error)) {
          return;
        }
        sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    },
  ];
}

export const campaignCompletionVerificationController =
  new CampaignCompletionVerificationController();
