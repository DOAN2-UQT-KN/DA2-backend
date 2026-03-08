import { PrismaClient } from '@prisma/client';
import prisma from '../../config/prisma.client';
import { UserEntity } from './user.entity';

export class UserRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    async create(entity: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<UserEntity> {
        return this.prisma.user.create({
            data: {
                email: entity.email,
                name: entity.name,
                password: entity.password,
                avatar: entity.avatar,
                bio: entity.bio,
                roleId: entity.roleId,
                emailVerified: entity.emailVerified,
                verificationToken: entity.verificationToken,
            },
        });
    }

    async findById(id: string): Promise<UserEntity | null> {
        return this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.prisma.user.findFirst({
            where: { email, deletedAt: null },
        });
    }

    async update(id: string, entity: Partial<UserEntity>): Promise<UserEntity> {
        return this.prisma.user.update({
            where: { id },
            data: entity,
        });
    }

    async softDelete(id: string): Promise<UserEntity> {
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async findAll(): Promise<UserEntity[]> {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
}

// Singleton instance
export const userRepository = new UserRepository();
