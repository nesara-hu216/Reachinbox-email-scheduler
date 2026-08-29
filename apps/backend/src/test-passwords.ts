import { PrismaClient } from '@prisma/client';

const users = ['postgres', 'sridh', 'sridhar', 'root', 'admin'];
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
  'Pass@123',
  'Postgres@123',
  'Admin@123',
  'root123',
  'postgres123',
  '12345678',
  ''
];

async function test() {
  for (const user of users) {
    for (const pwd of passwords) {
      const url = `postgresql://${user}:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        await prisma.$connect();
        console.log(`\n========================================`);
        console.log(`SUCCESS! User: "${user}", Password: "${pwd}"`);
        console.log(`========================================\n`);
        await prisma.$disconnect();
        process.exit(0);
      } catch (e: any) {
        await prisma.$disconnect();
      }
    }
  }
  console.log('No matching local Postgres credentials found on port 5432.');
}

test();
