import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAdmin, requireAuth } from '../lib/api-utils.js';

export async function billingRoutes(app: FastifyInstance) {
  // 管理员：计费报表
  app.get('/api/admin/billing/report', async (req, reply) => {
    try {
      await requireAdmin(req, reply);

      const { from, to, userId, model, granularity = 'daily' } = req.query as any;
      if (!from || !to) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '请指定时间范围' } });
      }

      const filter: any = {
        requestTime: { gte: new Date(from + 'T00:00:00.000'), lt: new Date(to + 'T23:59:59.999') },
      };
      if (userId) filter.userId = userId;
      if (model) filter.model = model;

      const logs = await prisma.apiUsageLog.findMany({
        where: filter,
        select: {
          requestTime: true, model: true,
          tokensUsed: true, inputTokens: true, outputTokens: true,
          cacheReadTokens: true, cacheCreationTokens: true,
          quotaUsed: true, cost: true,
        },
        orderBy: { requestTime: 'asc' },
      });

      const periodKey = granularity === 'monthly'
        ? (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : (d: Date) => d.toISOString().slice(0, 10);

      const breakdownMap = new Map<string, {
        period: string; cost: number; tokens: number;
        inputTokens: number; outputTokens: number;
        cacheReadTokens: number; cacheWriteTokens: number;
        quota: number; requests: number;
      }>();

      let totalCost = 0;
      let totalTokens = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCacheRead = 0;
      let totalCacheWrite = 0;
      let totalQuota = 0;

      for (const log of logs) {
        const key = periodKey(log.requestTime);
        const entry = breakdownMap.get(key) || {
          period: key, cost: 0, tokens: 0,
          inputTokens: 0, outputTokens: 0,
          cacheReadTokens: 0, cacheWriteTokens: 0,
          quota: 0, requests: 0,
        };

        entry.cost += Number(log.cost || 0);
        entry.tokens += log.tokensUsed;
        entry.inputTokens += log.inputTokens;
        entry.outputTokens += log.outputTokens;
        entry.cacheReadTokens += log.cacheReadTokens;
        entry.cacheWriteTokens += log.cacheCreationTokens;
        entry.quota += Number(log.quotaUsed);
        entry.requests += 1;

        breakdownMap.set(key, entry);

        totalCost += Number(log.cost || 0);
        totalTokens += log.tokensUsed;
        totalInputTokens += log.inputTokens;
        totalOutputTokens += log.outputTokens;
        totalCacheRead += log.cacheReadTokens;
        totalCacheWrite += log.cacheCreationTokens;
        totalQuota += Number(log.quotaUsed);
      }

      return reply.send({
        summary: {
          totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
          totalTokens,
          totalInputTokens,
          totalOutputTokens,
          totalCacheReadTokens: totalCacheRead,
          totalCacheWriteTokens: totalCacheWrite,
          totalQuota,
          totalRequests: logs.length,
        },
        breakdown: Array.from(breakdownMap.values()),
      });
    } catch (error) {
      console.error('Billing report error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取计费报表失败' } });
    }
  });

  // 管理员：用户计费明细
  app.get('/api/admin/billing/user-report/:userId', async (req, reply) => {
    try {
      await requireAdmin(req, reply);

      const { userId } = req.params as any;
      const { from, to, page: pageStr = '1', pageSize: pageSizeStr = '20' } = req.query as any;
      const page = parseInt(pageStr) || 1;
      const pageSize = parseInt(pageSizeStr) || 20;

      const filter: any = { userId };
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };

      const [logs, total, user] = await Promise.all([
        prisma.apiUsageLog.findMany({
          where: filter,
          select: {
            requestTime: true, model: true,
            inputTokens: true, outputTokens: true,
            cacheReadTokens: true, cacheCreationTokens: true,
            quotaUsed: true, cost: true,
          },
          orderBy: { requestTime: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.apiUsageLog.count({ where: filter }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
      ]);

      const summary = logs.reduce((acc, log) => ({
        totalCost: acc.totalCost + Number(log.cost || 0),
        totalQuota: acc.totalQuota + Number(log.quotaUsed),
        totalRequests: acc.totalRequests + 1,
      }), { totalCost: 0, totalQuota: 0, totalRequests: 0 });

      return reply.send({
        user: user || { id: userId, name: 'Unknown', email: '' },
        summary: {
          ...summary,
          totalCost: Math.round(summary.totalCost * 1_000_000) / 1_000_000,
        },
        logs: logs.map(l => ({
          time: l.requestTime,
          model: l.model,
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
      console.error('Billing user report error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取用户计费明细失败' } });
    }
  });
}
