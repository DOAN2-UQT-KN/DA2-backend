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

export type AdminListUsersSortBy = "created_at" | "name" | "email";
export type AdminListUsersSortOrder = "asc" | "desc";

export interface AdminListUsersQuery {
    search?: string;
    status?: number;
    sortBy: AdminListUsersSortBy;
    sortOrder: AdminListUsersSortOrder;
    page: number;
    limit: number;
}

export interface AdminBanUserBody {
    rejectReason: string;
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
    /** Role name when loaded (admin list). */
    roleName: string | null;
    emailVerified: boolean;
    status: number;
    rejectReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    /** Only included when the viewer is this user (or after a self-update). Otherwise null. */
    latitude: number | null;
    longitude: number | null;
    locationUpdatedAt: Date | null;
    detailAddress: string | null;
    notificationPreferences: NotificationPreferences;
}

export interface AdminUsersListResult {
    users: UserResponse[];
    total: number;
    page: number;
    limit: number;
}
