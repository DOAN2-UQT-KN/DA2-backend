import { Prisma } from '@prisma/client';
import {
    mergeNotificationPreferences,
    isNotificationEnabledForUser,
    NOTIFICATION_PREFERENCE_KEYS,
    type NotificationPreferences,
} from '@da2/constants';
import { AuthTokenType } from '../../constants/auth-token-type';
import { UserStatus } from '../../constants/user-status';
import { authTokenRepository } from '../auth/auth_token.repository';
import { userRepository } from './user.repository';
import { toUserResponse } from './user.entity';
import {
    AdminListUsersQuery,
    AdminUsersListResult,
    UpdateUserRequest,
    UserResponse,
} from './user.dto';

export class UserService {
    constructor() { }

    async getUserById(
        id: string,
        viewerUserId?: string | null,
    ): Promise<UserResponse | null> {
        const user = await userRepository.findById(id);
        if (!user) {
            return null;
        }
        const includeLocation =
            viewerUserId != null && viewerUserId === id;
        return toUserResponse(user, { includeLocation });
    }

    async getUsersByIds(ids: string[]): Promise<UserResponse[]> {
        const users = await userRepository.findByIds(ids);
        return users.map((u) => toUserResponse(u));
    }

    async getUserEmailById(id: string): Promise<string | null> {
        const row = await userRepository.findEmailById(id);
        return row?.email ?? null;
    }

    async getUserByEmail(
        email: string,
        viewerUserId?: string | null,
    ): Promise<UserResponse | null> {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return null;
        }
        const includeLocation =
            viewerUserId != null && viewerUserId === user.id;
        return toUserResponse(user, { includeLocation });
    }

    async updateUser(id: string, request: UpdateUserRequest): Promise<UserResponse> {
        const existing = await userRepository.findById(id);
        if (!existing) {
            throw new Error('User not found');
        }

        const latIn = request.latitude;
        const lngIn = request.longitude;
        if (
            (latIn !== undefined && lngIn === undefined) ||
            (lngIn !== undefined && latIn === undefined)
        ) {
            throw new Error(
                'latitude and longitude must be provided together',
            );
        }

        let locationPatch: {
            latitude?: number | null;
            longitude?: number | null;
            locationUpdatedAt?: Date | null;
            detailAddress?: string | null;
        } = {};
        if (latIn !== undefined && lngIn !== undefined) {
            if (latIn === null && lngIn === null) {
                locationPatch = {
                    latitude: null,
                    longitude: null,
                    locationUpdatedAt: null,
                    detailAddress: null,
                };
            } else if (
                typeof latIn === 'number' &&
                typeof lngIn === 'number'
            ) {
                locationPatch = {
                    latitude: latIn,
                    longitude: lngIn,
                    locationUpdatedAt: new Date(),
                };
            } else {
                throw new Error('Invalid latitude/longitude pair');
            }
        }

        let notificationPreferences: NotificationPreferences | undefined;
        if (request.notificationPreferences !== undefined) {
            const current = mergeNotificationPreferences(
                existing.notificationPreferences,
            );
            const patch = request.notificationPreferences;
            for (const key of NOTIFICATION_PREFERENCE_KEYS) {
                const v = patch[key];
                if (typeof v === 'boolean') {
                    current[key] = v;
                }
            }
            notificationPreferences = current;
        }

        const updateData: Prisma.UserUpdateInput = {
            ...(request.name !== undefined ? { name: request.name } : {}),
            ...(request.avatar !== undefined ? { avatar: request.avatar } : {}),
            ...(request.bio !== undefined ? { bio: request.bio } : {}),
            ...(request.phoneNumber !== undefined
                ? {
                      phoneNumber:
                          request.phoneNumber === null
                              ? null
                              : request.phoneNumber.trim() || null,
                  }
                : {}),
            ...(request.gender !== undefined ? { gender: request.gender } : {}),
            ...(request.dateOfBirth !== undefined
                ? {
                      dateOfBirth:
                          request.dateOfBirth === null
                              ? null
                              : new Date(`${request.dateOfBirth}T00:00:00.000Z`),
                  }
                : {}),
            ...(request.detailAddress !== undefined
                ? {
                      detailAddress:
                          request.detailAddress === null
                              ? null
                              : request.detailAddress.trim().slice(0, 255) || null,
                  }
                : {}),
            ...(request.roleId !== undefined
                ? { role: { connect: { id: request.roleId } } }
                : {}),
            ...locationPatch,
            ...(notificationPreferences !== undefined
                ? {
                      notificationPreferences:
                          notificationPreferences as Prisma.InputJsonValue,
                  }
                : {}),
        };

        const user = await userRepository.update(id, updateData);
        return toUserResponse(user, { includeLocation: true });
    }

    /** Internal: return user ids that have not opted out of this notification kind. */
    async filterUserIdsForNotificationKind(params: {
        userIds: string[];
        kind: string;
    }): Promise<string[]> {
        const rows = await userRepository.findNotificationPrefsByIds(
            params.userIds,
        );
        const prefById = new Map(
            rows.map((r) => [
                r.id,
                mergeNotificationPreferences(r.notificationPreferences),
            ]),
        );
        return params.userIds.filter((uid) => {
            const prefs =
                prefById.get(uid) ?? mergeNotificationPreferences(null);
            return isNotificationEnabledForUser(prefs, params.kind);
        });
    }

    async deleteUser(id: string): Promise<void> {
        const existing = await userRepository.findById(id);
        if (!existing) {
            throw new Error('User not found');
        }

        await userRepository.softDelete(id);
    }

    async getAllUsers(query: AdminListUsersQuery): Promise<AdminUsersListResult> {
        const { users, total } = await userRepository.findManyForAdmin(query);
        return {
            users: users.map((u) => toUserResponse(u, { includeLocation: true })),
            total,
            page: query.page,
            limit: query.limit,
        };
    }

    async adminBanUser(
        id: string,
        rejectReason: string,
        adminUserId: string,
    ): Promise<UserResponse> {
        if (id === adminUserId) {
            throw new Error('Cannot ban yourself');
        }

        const existing = await userRepository.findById(id);
        if (!existing) {
            throw new Error('User not found');
        }

        const trimmedReason = rejectReason.trim();
        if (!trimmedReason) {
            throw new Error('reject_reason is required when banning a user');
        }

        if (existing.status === UserStatus.INACTIVE) {
            if (existing.rejectReason === trimmedReason) {
                return toUserResponse(existing);
            }
            const updated = await userRepository.update(id, {
                rejectReason: trimmedReason,
            });
            return toUserResponse(updated);
        }

        const user = await userRepository.update(id, {
            status: UserStatus.INACTIVE,
            rejectReason: trimmedReason,
        });

        await authTokenRepository.revokeAllForUser(id, AuthTokenType.REFRESH);

        return toUserResponse(user);
    }

    /** Internal: user ids with last-known location within radius (meters). */
    async findUsersWithDistanceFromPointForInternal(params: {
        latitude: number;
        longitude: number;
    }): Promise<
        {
            id: string;
            email: string;
            name: string;
            latitude: number | null;
            longitude: number | null;
            distanceMeters: number | null;
        }[]
    > {
        return userRepository.findActiveUsersWithDistanceFromPoint(
            params.longitude,
            params.latitude,
        );
    }

    async findUserIdsNearPointForInternal(params: {
        latitude: number;
        longitude: number;
        radiusMeters: number;
        excludeUserIds: string[];
    }): Promise<string[]> {
        const found = await userRepository.findActiveUserIdsNearPoint(
            params.longitude,
            params.latitude,
            params.radiusMeters,
        );
        const exclude = new Set(
            params.excludeUserIds.map((x) => x.toLowerCase().trim()),
        );
        return found.filter((id) => !exclude.has(id.toLowerCase().trim()));
    }
}

// Singleton instance
export const userService = new UserService();
