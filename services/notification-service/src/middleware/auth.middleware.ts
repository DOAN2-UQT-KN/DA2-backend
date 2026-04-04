import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt.utils";
import { HTTP_STATUS, sendError } from "../constants/http-status";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      sendError(res, HTTP_STATUS.TOKEN_MISSING);
      return;
    }

    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, HTTP_STATUS.TOKEN_INVALID);
  }
};
