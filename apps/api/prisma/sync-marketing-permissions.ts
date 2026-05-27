/**
 * Sync marketing-manager role permissions (safe for production — no data wipe).
 * Run: npm run prisma:sync-marketing
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKETING_MANAGER_PERMISSIONS = [
  'dashboard.read',
  'clients.read',
  'clients.update',
  'marketing.read',
  'marketing.create',
  'marketing.update',
  'marketing.delete',
  'media.read',
  'media.create',
  'media.update',
  'models.read',
  'models.update',
  'ai.use',
  'chat.read',
  'chat.use',
  'calendar.read',
];

async function main() {
  const role = await prisma.role.findUnique({ where: { slug: 'marketing-manager' } });
  if (!role) throw new Error('marketing-manager role not found');

  const permissions = await prisma.permission.findMany({
    where: { slug: { in: MARKETING_MANAGER_PERMISSIONS } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  console.log(`marketing-manager: ${permissions.length} permissions synced`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
