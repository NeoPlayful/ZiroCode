import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // 总览统计
  app.get('/api/analytics/overview', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const [totalCalls, totalTokens, logs] = await Promise.all([
        prisma.apiUsageLog.count({ where: { userId: user.userId } }),
        prisma.apiUsageLog.aggregate({ where: { userId: user.userId }, _sum: { tokensUsed: true } }),
        prisma.apiUsageLog.findMany({ where: { userId: user.userId }, select: { model: true, tokensUsed: true }, take: 1000 }),
      ]);
      const totalCost = (logs.reduce((sum, l) => sum + l.tokensUsed, 0) / 1000000) * 0.002;
      return reply.send({ totalCalls, totalTokens: totalTokens._sum.tokensUsed || 0, totalCost: totalCost.toFixed(2) });
    } catch (error) {
      console.error('Analytics overview error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取统计失败' } });
    }
  });

  // 成本分析
  app.get('/api/analytics/cost', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { from, to, groupBy = 'day' } = req.query as any;
      const logs = await prisma.apiUsageLog.findMany({
        where: { userId: user.userId, requestTime: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
        select: { requestTime: true, tokensUsed: true },
        orderBy: { requestTime: 'asc' },
      });
      const grouped = logs.reduce((acc: any, log) => {
        const date = log.requestTime.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, tokens: 0, calls: 0 };
        acc[date].tokens += log.tokensUsed;
        acc[date].calls += 1;
        return acc;
      }, {});
      const data = Object.values(grouped).map((d: any) => ({ ...d, cost: (d.tokens / 1000000) * 0.002 }));
      return reply.send({ data });
    } catch (error) {
      console.error('Analytics cost error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取成本分析失败' } });
    }
  });

  // 模型使用分布
  app.get('/api/analytics/models', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const logs = await prisma.apiUsageLog.findMany({ where: { userId: user.userId }, select: { model: true, tokensUsed: true } });
      const grouped = logs.reduce((acc: any, log) => {
        if (!acc[log.model]) acc[log.model] = { model: log.model, calls: 0, tokens: 0 };
        acc[log.model].calls += 1;
        acc[log.model].tokens += log.tokensUsed;
        return acc;
      }, {});
      const data = Object.values(grouped).map((d: any) => ({ ...d, cost: (d.tokens / 1000000) * 0.002 }));
      return reply.send({ data });
    } catch (error) {
      console.error('Analytics models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型分布失败' } });
    }
  });

  // 导出数据
  app.get('/api/analytics/export', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { format = 'csv' } = req.query as any;
      const logs = await prisma.apiUsageLog.findMany({ where: { userId: user.userId }, orderBy: { requestTime: 'desc' }, take: 1000 });
      if (format === 'csv') {
        const csv = ['时间,模型,Token数,状态码'].concat(logs.map(l => `${l.requestTime.toISOString()},${l.model},${l.tokensUsed},${l.statusCode}`)).join('\n');
        return reply.header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename=usage.csv').send(csv);
      }
      return reply.send({ logs });
    } catch (error) {
      console.error('Analytics export error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '导出失败' } });
    }
  });
}
