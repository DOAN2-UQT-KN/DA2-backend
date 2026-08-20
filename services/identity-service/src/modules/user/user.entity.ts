import { User } from '@prisma/client';
import {
    mergeNotificationPreferences,
} from '@da2/constants';

// Type-based entity (not class)
export type UserEntity = User;

export type UserWithRole = UserEntity & {
    role?: { name: string } | null;
};

// Import the response type from DTOs
import { UserResponse } from './user.dto';

// Helper function for conversion (excludes password and sensitive fields)
export const toUserResponse = (
    entity: UserWithRole,
    options?: { includeLocation?: boolean },
): UserResponse => ({
    id: entity.id,
    email: entity.email,
    name: entity.name,
    avatar: entity.avatar,
    bio: entity.bio,
    phoneNumber: entity.phoneNumber ?? null,
    gender: (entity.gender as UserResponse['gender']) ?? null,
    dateOfBirth: entity.dateOfBirth ?? null,
    roleId: entity.roleId,
    roleName: entity.role?.name ?? null,
    emailVerified: entity.emailVerified,
    status: entity.status,
    rejectReason: entity.rejectReason ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    latitude: options?.includeLocation ? entity.latitude ?? null : null,
    longitude: options?.includeLocation ? entity.longitude ?? null : null,
    locationUpdatedAt: options?.includeLocation
        ? entity.locationUpdatedAt ?? null
        : null,
    detailAddress: options?.includeLocation
        ? entity.detailAddress ?? null
        : null,
    notificationPreferences: mergeNotificationPreferences(
        entity.notificationPreferences,
    ),
});
