import { NextFunction, Request, Response } from "express";
import { HTTP_STATUS, sendError } from "../constants/http-status";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("Unhandled error:", err);
  sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};
