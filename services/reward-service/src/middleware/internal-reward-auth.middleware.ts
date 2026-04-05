import { NextFunction, Request, Response } from "express";
import { HTTP_STATUS, sendError } from "../constants/http-status";

export const requireInternalRewardApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const expected = process.env.INTERNAL_REWARD_API_KEY;
  if (!expected) {
    sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR.withMessage(
        "INTERNAL_REWARD_API_KEY is not configured",
      ),
    );
    return;
  }

  const provided = req.header("x-internal-api-key");
  if (!provided || provided !== expected) {
    sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED.withMessage("Invalid internal API key"),
    );
    return;
  }

  next();
};
