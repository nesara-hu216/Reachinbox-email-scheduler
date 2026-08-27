import { PrismaClient } from '@prisma/client';

const passwords = [
  'postgrespassword',
  'postgres',
  'root',
  'admin',
  '1234',
  '123456',
  'password',
  'sridhar',
  'sridh',
  'ReachInbox',
  'Reachinbox',
  'outbox',
  'Outbox',
  ''
];

async function test() {
  for (const pwd of passwords) {
    const url = `postgresql://postgres:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$connect();
      console.log(`\n========================================`);
      console.log(`SUCCESS! Working Postgres Password is: "${pwd}"`);
      console.log(`========================================\n`);
      await prisma.$disconnect();
      process.exit(0);
    } catch (e: any) {
      console.log(`Password "${pwd}" failed: ${e.message ? e.message.split('\n')[0] : e}`);
      await prisma.$disconnect();
    }
  }
}

test();
