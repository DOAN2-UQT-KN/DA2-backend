import { NextFunction, Request, Response } from "express";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const toCamelCase = (key: string): string => {
  return key.replace(/_([a-zA-Z0-9])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
};

const toSnakeCase = (key: string): string => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
};

const transformKeysDeep = (
  value: unknown,
  keyTransformer: (key: string) => string,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => transformKeysDeep(item, keyTransformer));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, nestedValue]) => {
        acc[keyTransformer(key)] = transformKeysDeep(
          nestedValue,
          keyTransformer,
        );
        return acc;
      },
      {},
    );
  }

  return value;
};

export const caseTransformMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.body !== undefined) {
    req.body = transformKeysDeep(req.body, toCamelCase) as Request["body"];
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: JsonValue) => {
    const transformedBody = transformKeysDeep(body, toSnakeCase);
    return originalJson(transformedBody as JsonValue);
  }) as Response["json"];

  next();
};
