/** Values stored in `auth_tokens.type` — extend as needed (e.g. email verification). */
export const AuthTokenType = {
  REFRESH: "REFRESH",
  PASSWORD_RESET: "PASSWORD_RESET",
  /** Incident-service: verify organization `contactEmail` (metadata: organizationId, contactEmail). */
  ORGANIZATION_CONTACT_EMAIL: "ORGANIZATION_CONTACT_EMAIL",
} as const;

export type AuthTokenTypeValue =
  (typeof AuthTokenType)[keyof typeof AuthTokenType];
