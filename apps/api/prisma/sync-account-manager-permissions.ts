/**
 * Sync account-manager role permissions (read-only marketing calendar).
 * Run: npm run prisma:sync-account-manager
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNT_MANAGER_PERMISSIONS = [
  'dashboard.read',
  'clients.read',
  'marketing.read',
  'chat.read',
  'chat.use',
  'calendar.read',
];

async function main() {
  const role = await prisma.role.upsert({
    where: { slug: 'account-manager' },
    update: { name: 'Account Manager', description: 'Client accounts — view marketing calendar read-only' },
    create: {
      name: 'Account Manager',
      slug: 'account-manager',
      description: 'Client accounts — view marketing calendar read-only',
      isSystem: true,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: { slug: { in: ACCOUNT_MANAGER_PERMISSIONS } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  console.log(`account-manager: ${permissions.length} permissions synced (marketing read-only)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
