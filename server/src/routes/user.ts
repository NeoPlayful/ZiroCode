import type { FastifyInstance } from 'fastify';
import { verifySession, COOKIE_NAME } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getModelPrice, QUOTA_PER_DOLLAR } from '../lib/pricing.js';
import { getUserQuota } from '../lib/quota.js';
import bcrypt from 'bcryptjs';

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

  app.get('/api/user/profile', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: { id: true, email: true, name: true, role: true, referralCode: true, createdAt: true },
      });
      if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '用户不存在' } });

      return reply.send(user);
    } catch (error) {
      console.error('Profile error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取用户资料失败' } });
    }
  });

  app.put('/api/user/profile', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { name } = req.body as { name?: string };
      if (!name || name.trim().length === 0) {
        return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: '用户名不能为空' } });
      }

      const user = await prisma.user.update({
        where: { id: session.userId as string },
        data: { name: name.trim() },
        select: { id: true, email: true, name: true, role: true, referralCode: true, createdAt: true },
      });

      return reply.send(user);
    } catch (error) {
      console.error('Update profile error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新用户资料失败' } });
    }
  });

  app.put('/api/user/language', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { language } = req.body as { language?: string };
      if (!language || !['zh-CN', 'en-US'].includes(language)) {
        return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: '语言参数无效' } });
      }

      const user = await prisma.user.update({
        where: { id: session.userId as string },
        data: { language },
        select: { id: true, email: true, name: true, language: true },
      });

      return reply.send(user);
    } catch (error) {
      console.error('Update language error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新语言偏好失败' } });
    }
  });

  app.put('/api/user/password', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };
      if (!oldPassword || !newPassword) {
        return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: '旧密码和新密码不能为空' } });
      }
      if (newPassword.length < 6) {
        return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: '新密码长度至少为6位' } });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: { passwordHash: true },
      });
      if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '用户不存在' } });

      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) {
        return reply.status(400).send({ error: { code: 'INVALID_PASSWORD', message: '旧密码错误' } });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.userId as string },
        data: { passwordHash },
      });

      return reply.send({ message: '密码修改成功' });
    } catch (error) {
      console.error('Change password error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '修改密码失败' } });
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
        select: { id: true, model: true, tokensUsed: true, inputTokens: true, outputTokens: true, cacheCreationTokens: true, cacheReadTokens: true, quotaUsed: true, statusCode: true, requestTime: true, responseTime: true, error: true, latencyMs: true, clientIp: true, routePath: true, apiKey: { select: { name: true } } },
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

      // 24小时各模型花费趋势
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = await prisma.apiUsageLog.findMany({
        where: { userId: session.userId as string, requestTime: { gte: twentyFourHoursAgo } },
        select: { model: true, tokensUsed: true, requestTime: true },
        orderBy: { requestTime: 'asc' },
      });

      // 生成24个时间段，以当前小时为终点
      const slots: { hour: number; label: string; models: Record<string, { tokens: number; calls: number }> }[] = [];
      const now = new Date();
      const baseHour = new Date(now);
      baseHour.setMinutes(0, 0, 0);
      baseHour.setHours(baseHour.getHours() - 23);
      for (let i = 0; i < 24; i++) {
        const h = new Date(baseHour.getTime() + i * 60 * 60 * 1000);
        slots.push({
          hour: h.getHours(),
          label: `${h.getHours()}:00`,
          models: {},
        });
      }

      for (const log of recentLogs) {
        const logHour = new Date(log.requestTime);
        logHour.setMinutes(0, 0, 0);
        const idx = Math.floor((logHour.getTime() - baseHour.getTime()) / (60 * 60 * 1000));
        if (idx >= 0 && idx < 24) {
          const slot = slots[idx];
          if (!slot.models[log.model]) slot.models[log.model] = { tokens: 0, calls: 0 };
          slot.models[log.model].tokens += log.tokensUsed;
          slot.models[log.model].calls += 1;
        }
      }

      // 收集出现的模型列表
      const modelNames = [...new Set(recentLogs.map(l => l.model))];

      return reply.send({
        total: { calls: usageLogs.length, tokens: usageLogs.reduce((s, l) => s + l.tokensUsed, 0), quota: Number(usageLogs.reduce((s, l) => s + l.quotaUsed, BigInt(0))) },
        daily, byModel, recent: usageLogs.slice(0, 20).map(l => ({
          ...l,
          pricing: getModelPrice(l.model),
          quotaPerDollar: QUOTA_PER_DOLLAR,
        })),
        hourly: { slots, models: modelNames },
      });
    } catch (error) {
      console.error('Usage error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取使用统计失败' } });
    }
  });

  app.get('/api/user/billing', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { from, to, model, page: pageStr = '1', pageSize: pageSizeStr = '20' } = req.query as any;
      const userId = session.userId as string;
      const page = parseInt(pageStr) || 1;
      const pageSize = parseInt(pageSizeStr) || 20;

      const filter: any = { userId };
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };
      if (model) filter.model = model;

      const [logs, total] = await Promise.all([
        prisma.apiUsageLog.findMany({
          where: filter,
          select: {
            requestTime: true, model: true, statusCode: true,
            inputTokens: true, outputTokens: true,
            cacheReadTokens: true, cacheCreationTokens: true,
            quotaUsed: true, cost: true,
          },
          orderBy: { requestTime: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.apiUsageLog.count({ where: filter }),
      ]);

      const summary = logs.reduce((acc, log) => ({
        totalCost: acc.totalCost + Number(log.cost || 0),
        totalQuota: acc.totalQuota + Number(log.quotaUsed),
        totalTokens: acc.totalTokens + log.inputTokens + log.outputTokens + log.cacheReadTokens + log.cacheCreationTokens,
        totalRequests: acc.totalRequests + 1,
      }), { totalCost: 0, totalQuota: 0, totalTokens: 0, totalRequests: 0 });

      return reply.send({
        summary: {
          ...summary,
          totalCost: Math.round(summary.totalCost * 1_000_000) / 1_000_000,
        },
        logs: logs.map(l => ({
          time: l.requestTime,
          model: l.model,
          statusCode: l.statusCode,
          inputTokens: l.inputTokens,
          outputTokens: l.outputTokens,
          cacheReadTokens: l.cacheReadTokens,
          cacheWriteTokens: l.cacheCreationTokens,
          cost: Number(l.cost || 0),
          quotaUsed: Number(l.quotaUsed),
        })),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (error) {
      console.error('User billing error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取消费记录失败' } });
    }
  });
}
