const SNAKE_CASE_REGEX = /_([a-z])/g;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
};

export const toCamelCase = (value: string): string =>
  value.replace(SNAKE_CASE_REGEX, (_, letter: string) => letter.toUpperCase());

export const keysToCamelCase = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((item) => keysToCamelCase(item)) as T;
  }

  if (!isPlainObject(input)) {
    return input;
  }

  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    transformed[toCamelCase(key)] = keysToCamelCase(value);
  }

  return transformed as T;
};
