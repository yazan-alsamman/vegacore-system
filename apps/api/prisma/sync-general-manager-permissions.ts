/**
 * Sync general-manager role permissions (safe for production — no data wipe).
 * Run: npm run prisma:sync-general-manager
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FINANCE_PERMISSIONS = ['finance.read', 'finance.create', 'finance.update', 'finance.delete'];

const ALL_PERMISSIONS = [
  'dashboard.read',
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'rbac.read',
  'rbac.manage',
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
  'projects.read',
  'projects.create',
  'projects.update',
  'projects.delete',
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'marketing.read',
  'marketing.create',
  'marketing.update',
  'marketing.delete',
  'media.read',
  'media.create',
  'media.update',
  'media.delete',
  'models.read',
  'models.create',
  'models.update',
  'models.delete',
  'hr.read',
  'hr.create',
  'hr.update',
  'hr.delete',
  'hr.manage',
  'archive.read',
  'archive.create',
  'archive.update',
  'archive.delete',
  'ai.use',
  'ai.read',
  'ai.manage',
  'audit.read',
  'security.read',
  'security.create',
  'security.update',
  'security.delete',
  'chat.read',
  'chat.use',
  'reports.read',
  'reports.generate',
  'calendar.read',
];

const GENERAL_MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter((s) => !FINANCE_PERMISSIONS.includes(s));

async function main() {
  const role = await prisma.role.findUnique({ where: { slug: 'general-manager' } });
  if (!role) throw new Error('general-manager role not found');

  const permissions = await prisma.permission.findMany({
    where: { slug: { in: GENERAL_MANAGER_PERMISSIONS } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  console.log(`general-manager: ${permissions.length} permissions synced (finance excluded)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
