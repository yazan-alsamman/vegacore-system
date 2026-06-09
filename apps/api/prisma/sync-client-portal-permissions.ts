/**
 * Sync client portal role permissions.
 * Run: npm run prisma:sync-client-portal
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLIENT_PORTAL_PERMISSIONS = [
  'clients.read',
  'marketing.read',
  'media.read',
  'finance.read',
  'calendar.read',
  'chat.read',
  'chat.use',
];

async function main() {
  const role = await prisma.role.upsert({
    where: { slug: 'client' },
    update: { name: 'Client', description: 'Client portal — own profile, content, and finances' },
    create: {
      name: 'Client',
      slug: 'client',
      description: 'Client portal — own profile, content, and finances',
      isSystem: true,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: { slug: { in: CLIENT_PORTAL_PERMISSIONS } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  console.log(`client: ${permissions.length} portal permissions synced`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
