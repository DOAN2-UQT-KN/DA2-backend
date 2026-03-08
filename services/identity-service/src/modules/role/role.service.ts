import { roleRepository } from './role.repository';
import { isValidPermission } from './permission.enum';
import {
    CreateRoleRequest,
    UpdateRoleRequest,
    RoleResponse,
    CreatePermissionSetRequest,
    UpdatePermissionSetRequest,
    PermissionSetResponse,
} from './role.dto';

export class RoleService {
    constructor() { }

    // ── Role operations ────────────────────────────────────

    async createRole(request: CreateRoleRequest): Promise<RoleResponse> {
        const existing = await roleRepository.findRoleByName(request.name);
        if (existing) {
            throw new Error('Role with this name already exists');
        }

        const role = await roleRepository.createRole({
            name: request.name,
            description: request.description,
        });

        // Link permission sets if provided
        if (request.permissionSetIds && request.permissionSetIds.length > 0) {
            await roleRepository.replacePermissionSetsForRole(role.id, request.permissionSetIds);
        }

        return this.getRoleById(role.id) as Promise<RoleResponse>;
    }

    async getRoleById(id: string): Promise<RoleResponse | null> {
        const role = await roleRepository.findRoleById(id);
        if (!role) return null;

        const permissionSets = await roleRepository.findPermissionSetsByRoleId(role.id);

        return {
            id: role.id,
            name: role.name,
            description: role.description,
            permissionSets: permissionSets.map(ps => ({
                id: ps.id,
                name: ps.name,
                description: ps.description,
                permissions: ps.permissions,
                createdAt: ps.createdAt,
                updatedAt: ps.updatedAt,
            })),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }

    async getAllRoles(): Promise<RoleResponse[]> {
        const roles = await roleRepository.findAllRoles();
        const responses: RoleResponse[] = [];

        for (const role of roles) {
            const permissionSets = await roleRepository.findPermissionSetsByRoleId(role.id);
            responses.push({
                id: role.id,
                name: role.name,
                description: role.description,
                permissionSets: permissionSets.map(ps => ({
                    id: ps.id,
                    name: ps.name,
                    description: ps.description,
                    permissions: ps.permissions,
                    createdAt: ps.createdAt,
                    updatedAt: ps.updatedAt,
                })),
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            });
        }

        return responses;
    }

    async updateRole(id: string, request: UpdateRoleRequest): Promise<RoleResponse> {
        const existing = await roleRepository.findRoleById(id);
        if (!existing) {
            throw new Error('Role not found');
        }

        if (request.name) {
            const nameCheck = await roleRepository.findRoleByName(request.name);
            if (nameCheck && nameCheck.id !== id) {
                throw new Error('Role with this name already exists');
            }
        }

        await roleRepository.updateRole(id, {
            name: request.name,
            description: request.description,
        });

        // Update permission set links if provided
        if (request.permissionSetIds !== undefined) {
            await roleRepository.replacePermissionSetsForRole(id, request.permissionSetIds);
        }

        return this.getRoleById(id) as Promise<RoleResponse>;
    }

    async deleteRole(id: string): Promise<void> {
        const existing = await roleRepository.findRoleById(id);
        if (!existing) {
            throw new Error('Role not found');
        }

        await roleRepository.softDeleteRole(id);
    }

    // ── PermissionSet operations ───────────────────────────

    async createPermissionSet(request: CreatePermissionSetRequest): Promise<PermissionSetResponse> {
        // Validate all permissions
        const invalidPermissions = request.permissions.filter(p => !isValidPermission(p));
        if (invalidPermissions.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }

        const permissionSet = await roleRepository.createPermissionSet({
            name: request.name,
            description: request.description,
            permissions: request.permissions,
        });

        return {
            id: permissionSet.id,
            name: permissionSet.name,
            description: permissionSet.description,
            permissions: permissionSet.permissions,
            createdAt: permissionSet.createdAt,
            updatedAt: permissionSet.updatedAt,
        };
    }

    async getPermissionSetById(id: string): Promise<PermissionSetResponse | null> {
        const ps = await roleRepository.findPermissionSetById(id);
        if (!ps) return null;

        return {
            id: ps.id,
            name: ps.name,
            description: ps.description,
            permissions: ps.permissions,
            createdAt: ps.createdAt,
            updatedAt: ps.updatedAt,
        };
    }

    async getAllPermissionSets(): Promise<PermissionSetResponse[]> {
        const permissionSets = await roleRepository.findAllPermissionSets();
        return permissionSets.map(ps => ({
            id: ps.id,
            name: ps.name,
            description: ps.description,
            permissions: ps.permissions,
            createdAt: ps.createdAt,
            updatedAt: ps.updatedAt,
        }));
    }

    async updatePermissionSet(id: string, request: UpdatePermissionSetRequest): Promise<PermissionSetResponse> {
        const existing = await roleRepository.findPermissionSetById(id);
        if (!existing) {
            throw new Error('Permission set not found');
        }

        // Validate permissions if provided
        if (request.permissions) {
            const invalidPermissions = request.permissions.filter(p => !isValidPermission(p));
            if (invalidPermissions.length > 0) {
                throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
            }
        }

        const updated = await roleRepository.updatePermissionSet(id, {
            name: request.name,
            description: request.description,
            permissions: request.permissions,
        });

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            permissions: updated.permissions,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    async deletePermissionSet(id: string): Promise<void> {
        const existing = await roleRepository.findPermissionSetById(id);
        if (!existing) {
            throw new Error('Permission set not found');
        }

        await roleRepository.softDeletePermissionSet(id);
    }
}

// Singleton instance
export const roleService = new RoleService();
