import { NextFunction, Request, Response } from "express";
import { keysToCamelCase, keysToSnakeCase } from "../utils/case-converter";

/**
 * Converts incoming request body keys from snake_case to camelCase.
 */
export const camelCaseRequestBody = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body && typeof req.body === "object") {
    req.body = keysToCamelCase(req.body);
  }

  next();
};

/**
 * Wraps res.json to convert all response payload keys to snake_case.
 */
export const snakeCaseResponseBody = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) =>
    originalJson(keysToSnakeCase(body))) as typeof res.json;

  next();
};
