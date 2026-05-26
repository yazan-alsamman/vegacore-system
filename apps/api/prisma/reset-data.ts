/**
 * Wipes all application data and keeps RBAC + super-admin account only.
 * Run: npm run prisma:reset-data
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@vegasystem.local';
const ADMIN_PASSWORD = 'Admin@123';

/** Tables to truncate (PostgreSQL). RBAC tables are excluded. */
const TABLES_TO_TRUNCATE = [
  'chat_messages',
  'chat_participants',
  'chat_rooms',
  'smart_reports',
  'activities',
  'audit_logs',
  'notifications',
  'ai_requests',
  'vulnerabilities',
  'security_reports',
  'approvals',
  'meeting_attendees',
  'meetings',
  'contracts',
  'asset_versions',
  'assets',
  'payroll',
  'expenses',
  'subscriptions',
  'payments',
  'invoices',
  'performance_reports',
  'leave_requests',
  'attendance',
  'employee_profiles',
  'model_bookings',
  'model_profiles',
  'videos',
  'shoots',
  'scripts',
  'campaigns',
  'content_calendar',
  'comments',
  'task_attachments',
  'tasks',
  'milestones',
  'sprints',
  'project_members',
  'project_issues',
  'project_phases',
  'projects',
  'client_timeline',
  'client_packages',
  'clients',
  'refresh_tokens',
  'sessions',
  'users',
] as const;

async function main() {
  console.log('Resetting database (keeping roles, permissions, super-admin only)...');

  const adminRole = await prisma.role.findUnique({ where: { slug: 'super-admin' } });
  if (!adminRole) {
    throw new Error('super-admin role not found. Run: npm run prisma:seed');
  }

  const tableList = TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
      locale: 'en',
      status: 'ACTIVE',
    },
  });

  const [users, clients, projects] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.project.count(),
  ]);

  console.log('Reset complete.');
  console.log(`Users: ${users} | Clients: ${clients} | Projects: ${projects}`);
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
