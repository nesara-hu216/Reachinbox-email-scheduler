import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.com' },
    update: {
      name: 'ReachInbox Demo User',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
    },
    create: {
      name: 'ReachInbox Demo User',
      email: 'demo@reachinbox.com',
      googleId: 'demo-google-id-12345',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
    },
  });
  console.log('✅ Demo user seeded:', demoUser.email);

  // 2. Generate or Upsert Ethereal Sender Account
  let senderEmail = 'outreach@reachinbox-ethereal.com';
  let ethUser = process.env.SMTP_USER;
  let ethPass = process.env.SMTP_PASSWORD;

  if (!ethUser || !ethPass) {
    console.log('🔑 Generating dynamic Nodemailer Ethereal test account for seeding...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      ethUser = testAccount.user;
      ethPass = testAccount.pass;
      senderEmail = testAccount.user;
    } catch (err: any) {
      console.warn('⚠️ Ethereal API dynamic account creation failed, using fallback test credentials:', err.message);
      ethUser = 'ethereal.demo.user@ethereal.email';
      ethPass = 'etherealDemoPass123';
      senderEmail = 'outreach@reachinbox-ethereal.com';
    }
  }

  const sender = await prisma.sender.upsert({
    where: { email: senderEmail },
    update: {
      etherealUser: ethUser,
      etherealPassword: ethPass,
    },
    create: {
      name: 'Primary Ethereal Sender',
      email: senderEmail,
      etherealUser: ethUser,
      etherealPassword: ethPass,
    },
  });
  console.log('✅ Default Sender seeded:', sender.email);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
