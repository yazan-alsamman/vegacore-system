/**
 * Ensure every staff user (except client/model) has an employeeProfile row.
 * Run: npm run prisma:backfill-profiles
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { slug: { notIn: ['client', 'model'] } } },
    select: { id: true, email: true, employeeProfile: { select: { id: true } } },
  });

  let created = 0;
  for (const user of users) {
    if (!user.employeeProfile) {
      await prisma.employeeProfile.create({ data: { userId: user.id } });
      created += 1;
      console.log(`profile created: ${user.email}`);
    }
  }

  console.log(`Done. ${created} profile(s) created, ${users.length - created} already existed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
