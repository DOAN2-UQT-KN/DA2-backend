/** User account status (matches GlobalStatus ACTIVE/INACTIVE used elsewhere). */
export const UserStatus = {
  ACTIVE: 1,
  INACTIVE: 2,
} as const;

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];
