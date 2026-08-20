import type { NotificationPreferences } from "@da2/constants";

// Request DTOs
export interface CreateUserRequest {
    email: string;
    name: string;
    password: string;
    avatar?: string;
    bio?: string;
    roleId: string;
}

export type UserGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UpdateUserRequest {
    name?: string;
    avatar?: string | null;
    bio?: string;
    roleId?: string;
    phoneNumber?: string | null;
    gender?: UserGender | null;
    /** ISO date `YYYY-MM-DD`, or `null` to clear. */
    dateOfBirth?: string | null;
    /** Both required together when updating; use `null` for both to clear stored location. */
    latitude?: number | null;
    longitude?: number | null;
    detailAddress?: string | null;
    notificationPreferences?: Partial<NotificationPreferences>;
}

// Response DTOs (excludes password and sensitive fields)
export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    phoneNumber: string | null;
    gender: UserGender | null;
    dateOfBirth: Date | null;
    roleId: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    /** Only included when the viewer is this user (or after a self-update). Otherwise null. */
    latitude: number | null;
    longitude: number | null;
    locationUpdatedAt: Date | null;
    detailAddress: string | null;
    notificationPreferences: NotificationPreferences;
}
