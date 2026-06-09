/**
 * Sync client portal role permissions + demo portal account.
 * Run: npm run prisma:sync-client-portal
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_PORTAL_EMAIL = 'client@democorp.com';
const DEMO_PORTAL_PASSWORD = 'Client@123';

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

  const demoClient = await prisma.client.findUnique({ where: { id: DEMO_CLIENT_ID } });
  if (!demoClient) {
    console.log('demo client record not found — skip portal user (run full seed first)');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PORTAL_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: DEMO_PORTAL_EMAIL },
    update: {
      clientId: demoClient.id,
      roleId: role.id,
      status: 'ACTIVE',
      passwordHash,
      firstName: 'John',
      lastName: 'Demo',
    },
    create: {
      email: DEMO_PORTAL_EMAIL,
      passwordHash,
      firstName: 'John',
      lastName: 'Demo',
      roleId: role.id,
      clientId: demoClient.id,
      locale: 'ar',
    },
  });

  console.log(`demo portal user ready: ${DEMO_PORTAL_EMAIL} / ${DEMO_PORTAL_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
