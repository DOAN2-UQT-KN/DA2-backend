import { PrismaClient, Role, PermissionSet, RolePermissionSet } from '@prisma/client';
import prisma from '../../config/prisma.client';

export class RoleRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    // ── Role CRUD ──────────────────────────────────────────

    async createRole(data: { name: string; description?: string }): Promise<Role> {
        return this.prisma.role.create({ data });
    }

    async findRoleById(id: string): Promise<Role | null> {
        return this.prisma.role.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findRoleByName(name: string): Promise<Role | null> {
        return this.prisma.role.findFirst({
            where: { name, deletedAt: null },
        });
    }

    async findAllRoles(): Promise<Role[]> {
        return this.prisma.role.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateRole(id: string, data: Partial<Role>): Promise<Role> {
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }

    async softDeleteRole(id: string): Promise<Role> {
        return this.prisma.role.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    // ── PermissionSet CRUD ─────────────────────────────────

    async createPermissionSet(data: { name: string; description?: string; permissions: string[] }): Promise<PermissionSet> {
        return this.prisma.permissionSet.create({ data });
    }

    async findPermissionSetById(id: string): Promise<PermissionSet | null> {
        return this.prisma.permissionSet.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findAllPermissionSets(): Promise<PermissionSet[]> {
        return this.prisma.permissionSet.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updatePermissionSet(id: string, data: Partial<PermissionSet>): Promise<PermissionSet> {
        return this.prisma.permissionSet.update({
            where: { id },
            data,
        });
    }

    async softDeletePermissionSet(id: string): Promise<PermissionSet> {
        return this.prisma.permissionSet.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    // ── RolePermissionSet (join table) ─────────────────────

    async linkPermissionSetToRole(roleId: string, permissionSetId: string): Promise<RolePermissionSet> {
        return this.prisma.rolePermissionSet.create({
            data: { roleId, permissionSetId },
        });
    }

    async unlinkPermissionSetFromRole(roleId: string, permissionSetId: string): Promise<void> {
        const existing = await this.prisma.rolePermissionSet.findFirst({
            where: { roleId, permissionSetId, deletedAt: null },
        });
        if (existing) {
            await this.prisma.rolePermissionSet.update({
                where: { id: existing.id },
                data: { deletedAt: new Date() },
            });
        }
    }

    async findPermissionSetsByRoleId(roleId: string): Promise<PermissionSet[]> {
        const links = await this.prisma.rolePermissionSet.findMany({
            where: { roleId, deletedAt: null },
        });

        const permissionSetIds = links.map(l => l.permissionSetId);

        return this.prisma.permissionSet.findMany({
            where: {
                id: { in: permissionSetIds },
                deletedAt: null,
            },
        });
    }

    async replacePermissionSetsForRole(roleId: string, permissionSetIds: string[]): Promise<void> {
        // Soft-delete existing links
        await this.prisma.rolePermissionSet.updateMany({
            where: { roleId, deletedAt: null },
            data: { deletedAt: new Date() },
        });

        // Create new links
        if (permissionSetIds.length > 0) {
            await this.prisma.rolePermissionSet.createMany({
                data: permissionSetIds.map(permissionSetId => ({
                    roleId,
                    permissionSetId,
                })),
            });
        }
    }
}

// Singleton instance
export const roleRepository = new RoleRepository();
