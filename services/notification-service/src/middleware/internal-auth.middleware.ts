import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS, sendError } from "../constants/http-status";

/**
 * Server-to-server calls (e.g. incident-service) must send this header.
 */
export const requireInternalApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const expected = process.env.INTERNAL_NOTIFICATION_API_KEY;
  if (!expected) {
    sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR.withMessage(
        "INTERNAL_NOTIFICATION_API_KEY is not configured",
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
