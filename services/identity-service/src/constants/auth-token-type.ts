/** Values stored in `auth_tokens.type` — extend as needed (e.g. email verification). */
export const AuthTokenType = {
  REFRESH: "REFRESH",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

export type AuthTokenTypeValue =
  (typeof AuthTokenType)[keyof typeof AuthTokenType];
