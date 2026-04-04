import { NextFunction, Request, Response } from "express";
import { HTTP_STATUS, sendError } from "../constants/http-status";

/**
 * Service-to-service calls (e.g. notification-service resolving user email).
 */
export const requireInternalIdentityApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const expected = process.env.INTERNAL_IDENTITY_API_KEY;
  if (!expected) {
    sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR.withMessage(
        "INTERNAL_IDENTITY_API_KEY is not configured",
      ),
    );
    return;
  }

  const provided = req.header("x-internal-api-key");
  if (!provided || provided !== expected) {
    sendError(res, HTTP_STATUS.UNAUTHORIZED.withMessage("Invalid internal API key"));
    return;
  }

  next();
};
