import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function genCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  // 创建管理员
  await prisma.user.upsert({
    where: { email: 'admin@zirocode.com' },
    update: {},
    create: {
      email: 'admin@zirocode.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin',
      role: 'ADMIN',
      referralCode: genCode(),
    },
  });

  // 创建测试用户
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('test123', 10),
      name: 'Test User',
      role: 'USER',
      referralCode: genCode(),
    },
  });

  // 创建测试兑换码
  await prisma.redeemCode.upsert({
    where: { code: 'TEST1000' },
    update: {},
    create: {
      code: 'TEST1000',
      quotaAmount: BigInt(100000000),
      type: 'PAY_AS_YOU_GO',
      maxUses: 10,
    },
  });

  // 创建永久兑换码
  await prisma.redeemCode.upsert({
    where: { code: 'VIPFOREVER' },
    update: {},
    create: {
      code: 'VIPFOREVER',
      quotaAmount: BigInt(1000000000),
      type: 'PERMANENT',
      maxUses: 5,
    },
  });

  // 创建模型渠道
  await prisma.modelChannel.upsert({
    where: { name: 'openai' },
    update: {},
    create: {
      name: 'openai',
      displayName: 'OpenAI',
      displayOrder: 1,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      isActive: true,
      priority: 1,
    },
  });

  // 创建订阅套餐
  const plans = [
    { name: '按量套餐', type: 'PAY_AS_YOU_GO' as const, price: 10, quotaAmount: BigInt(10000000) },
    { name: '月卡套餐', type: 'MONTHLY' as const, price: 99, quotaAmount: BigInt(500000000), durationDays: 30 },
    { name: '永久套餐', type: 'PERMANENT' as const, price: 499, quotaAmount: BigInt(3000000000) },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }

  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
