/**
 * Permission enum — defines all granular permissions in the system.
 * These values are stored as strings in the PermissionSet.permissions array.
 * Extend this enum as new features are added.
 */
export enum Permission {
    // User management
    USER_READ = 'USER_READ',
    USER_WRITE = 'USER_WRITE',
    USER_DELETE = 'USER_DELETE',

    // Role management
    ROLE_READ = 'ROLE_READ',
    ROLE_WRITE = 'ROLE_WRITE',
    ROLE_DELETE = 'ROLE_DELETE',

    // Permission set management
    PERMISSION_SET_READ = 'PERMISSION_SET_READ',
    PERMISSION_SET_WRITE = 'PERMISSION_SET_WRITE',
    PERMISSION_SET_DELETE = 'PERMISSION_SET_DELETE',
}

/**
 * Get all permission values as an array
 */
export const getAllPermissions = (): string[] => {
    return Object.values(Permission);
};

/**
 * Validate if a string is a valid Permission
 */
export const isValidPermission = (value: string): value is Permission => {
    return Object.values(Permission).includes(value as Permission);
};
