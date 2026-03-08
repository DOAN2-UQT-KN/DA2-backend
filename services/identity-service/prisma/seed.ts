import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create default roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
            name: 'ADMIN',
            description: 'Administrator with full access',
        },
    });

    const userRole = await prisma.role.upsert({
        where: { name: 'USER' },
        update: {},
        create: {
            name: 'USER',
            description: 'Standard user with limited access',
        },
    });

    console.log(`✅ Roles created: ${adminRole.name}, ${userRole.name}`);

    // 2. Create default permission sets (example)
    const basicPerms = await prisma.permissionSet.upsert({
        where: { name: 'BASIC_ACCESS' },
        update: {},
        create: {
            name: 'BASIC_ACCESS',
            description: 'Basic access permissions',
            permissions: ['READ_SELF', 'UPDATE_SELF'],
        },
    });

    console.log(`✅ Permission sets created: ${basicPerms.name}`);

    console.log('✨ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
