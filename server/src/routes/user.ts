import type { FastifyInstance } from 'fastify';
import { verifySession, COOKIE_NAME } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getUserQuota } from '../lib/quota.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/api/user/dashboard', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const userId = session.userId as string;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
      if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '用户不存在' } });

      const quota = await getUserQuota(userId);
      const subscriptions = await prisma.subscription.findMany({
        where: { userId, isActive: true },
        select: { id: true, type: true, quotaTotal: true, quotaUsed: true, quotaMonthly: true, quotaMonthlyUsed: true, expiresAt: true, startsAt: true },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        user, subscriptions, hasActiveSubscription: quota.hasActiveSubscription,
        quota: {
          payAsYouGo: { total: Number(quota.payAsYouGoTotal), used: Number(quota.payAsYouGoUsed), remaining: Number(quota.payAsYouGoRemaining) },
          monthly: { total: quota.monthlyTotal ? Number(quota.monthlyTotal) : null, used: Number(quota.monthlyUsed), remaining: quota.monthlyRemaining ? Number(quota.monthlyRemaining) : null },
        },
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取仪表板数据失败' } });
    }
  });

  app.get('/api/user/quota', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const quota = await getUserQuota(session.userId as string);
      return reply.send({
        payAsYouGo: { total: Number(quota.payAsYouGoTotal), used: Number(quota.payAsYouGoUsed), remaining: Number(quota.payAsYouGoRemaining) },
        monthly: { total: quota.monthlyTotal ? Number(quota.monthlyTotal) : null, used: Number(quota.monthlyUsed), remaining: quota.monthlyRemaining ? Number(quota.monthlyRemaining) : null },
        hasActiveSubscription: quota.hasActiveSubscription,
      });
    } catch (error) {
      console.error('Quota error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取配额信息失败' } });
    }
  });

  app.get('/api/user/usage', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const usageLogs = await prisma.apiUsageLog.findMany({
        where: { userId: session.userId as string },
        orderBy: { requestTime: 'desc' }, take: 100,
        select: { id: true, model: true, tokensUsed: true, quotaUsed: true, statusCode: true, requestTime: true },
      });

      const dailyMap = new Map<string, { tokens: number; quota: number; calls: number }>();
      for (const log of usageLogs) {
        const day = log.requestTime.toISOString().slice(0, 10);
        const entry = dailyMap.get(day) || { tokens: 0, quota: 0, calls: 0 };
        entry.tokens += log.tokensUsed; entry.quota += Number(log.quotaUsed); entry.calls += 1;
        dailyMap.set(day, entry);
      }
      const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));

      const modelMap = new Map<string, { tokens: number; calls: number }>();
      for (const log of usageLogs) {
        const entry = modelMap.get(log.model) || { tokens: 0, calls: 0 };
        entry.tokens += log.tokensUsed; entry.calls += 1;
        modelMap.set(log.model, entry);
      }
      const byModel = Array.from(modelMap.entries()).map(([model, data]) => ({ model, ...data }));

      return reply.send({
        total: { calls: usageLogs.length, tokens: usageLogs.reduce((s, l) => s + l.tokensUsed, 0), quota: Number(usageLogs.reduce((s, l) => s + l.quotaUsed, BigInt(0))) },
        daily, byModel, recent: usageLogs.slice(0, 20),
      });
    } catch (error) {
      console.error('Usage error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取使用统计失败' } });
    }
  });
}
