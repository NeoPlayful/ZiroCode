import { prisma } from './db';
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis };

function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });
  }
  return globalForRedis.redis;
}

let rateLimitCache: { max: number; window: number; time: number } | null = null;

async function getRateLimitConfig(): Promise<{ max: number; window: number }> {
  if (rateLimitCache && Date.now() - rateLimitCache.time < 60000) {
    return { max: rateLimitCache.max, window: rateLimitCache.window };
  }
  try {
    const [maxConfig, windowConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'rate_limit_max' } }),
      prisma.systemConfig.findUnique({ where: { key: 'rate_limit_window' } }),
    ]);
    const max = maxConfig?.value ? Number(maxConfig.value) : 30;
    const window = windowConfig?.value ? Number(windowConfig.value) : 60;
    rateLimitCache = { max, window, time: Date.now() };
    return { max, window };
  } catch {
    return { max: 30, window: 60 };
  }
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  const redis = getRedis();
  try {
    const config = await getRateLimitConfig();
    const key = `ratelimit:${userId}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, config.window);
    }
    return current <= config.max;
  } catch {
    return true; // fail open if Redis is down
  }
}

export interface QuotaInfo {
  payAsYouGoTotal: bigint;
  payAsYouGoUsed: bigint;
  payAsYouGoRemaining: bigint;
  monthlyTotal: bigint | null;
  monthlyUsed: bigint;
  monthlyRemaining: bigint | null;
  hasActiveSubscription: boolean;
}

export async function getUserQuota(userId: string): Promise<QuotaInfo> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  let payAsYouGoTotal = BigInt(0);
  let payAsYouGoUsed = BigInt(0);
  let monthlyTotal: bigint | null = null;
  let monthlyUsed = BigInt(0);

  for (const sub of subscriptions) {
    if (sub.type === 'MONTHLY') {
      monthlyTotal = (monthlyTotal ?? BigInt(0)) + (sub.quotaMonthly ?? BigInt(0));
      monthlyUsed = monthlyUsed + sub.quotaMonthlyUsed;
    } else {
      payAsYouGoTotal = payAsYouGoTotal + sub.quotaTotal;
      payAsYouGoUsed = payAsYouGoUsed + sub.quotaUsed;
    }
  }

  return {
    payAsYouGoTotal,
    payAsYouGoUsed,
    payAsYouGoRemaining: payAsYouGoTotal - payAsYouGoUsed,
    monthlyTotal,
    monthlyUsed,
    monthlyRemaining: monthlyTotal !== null ? monthlyTotal - monthlyUsed : null,
    hasActiveSubscription: subscriptions.length > 0,
  };
}

export async function deductQuota(userId: string, amount: bigint): Promise<boolean> {
  // Priority: monthly first, then pay-as-you-go
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, isActive: true },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  });

  let remaining = amount;

  for (const sub of subscriptions) {
    if (remaining <= BigInt(0)) break;

    if (sub.type === 'MONTHLY' && sub.quotaMonthly !== null) {
      const monthlyAvailable = sub.quotaMonthly - sub.quotaMonthlyUsed;
      if (monthlyAvailable > BigInt(0)) {
        const deduct = monthlyAvailable >= remaining ? remaining : monthlyAvailable;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { quotaMonthlyUsed: { increment: deduct } },
        });
        remaining = remaining - deduct;
      }
    }
  }

  for (const sub of subscriptions) {
    if (remaining <= BigInt(0)) break;

    if (sub.type !== 'MONTHLY') {
      const available = sub.quotaTotal - sub.quotaUsed;
      if (available > BigInt(0)) {
        const deduct = available >= remaining ? remaining : available;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { quotaUsed: { increment: deduct } },
        });
        remaining = remaining - deduct;
      }
    }
  }

  return remaining <= BigInt(0);
}

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sk-';
  for (let i = 0; i < 95; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRedeemCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
