// Role DTOs
export interface CreateRoleRequest {
    name: string;
    description?: string;
    permissionSetIds?: string[]; // UUIDs of permission sets to link
}

export interface UpdateRoleRequest {
    name?: string;
    description?: string;
    permissionSetIds?: string[];
}

export interface RoleResponse {
    id: string;
    name: string;
    description: string | null;
    permissionSets: PermissionSetResponse[];
    createdAt: Date;
    updatedAt: Date;
}

// PermissionSet DTOs
export interface CreatePermissionSetRequest {
    name: string;
    description?: string;
    permissions: string[]; // Array of Permission enum values
}

export interface UpdatePermissionSetRequest {
    name?: string;
    description?: string;
    permissions?: string[];
}

export interface PermissionSetResponse {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}
