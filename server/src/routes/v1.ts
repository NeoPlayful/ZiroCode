import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { getUserQuota, deductQuota, checkRateLimit } from '../lib/quota.js';

async function validateApiKey(authHeader: string | null): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer sk-')) return null;
  const key = authHeader.replace('Bearer ', '');
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

export async function v1Routes(app: FastifyInstance) {
  app.post('/api/v1/chat/completions', async (req, reply) => {
    try {
      const auth = await validateApiKey(req.headers.authorization || null);
      if (!auth) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '无效的 API Key' } });

      const allowed = await checkRateLimit(auth.userId);
      if (!allowed) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: '请求过于频繁' } });

      const quota = await getUserQuota(auth.userId);
      if (quota.payAsYouGoRemaining <= BigInt(0) && (quota.monthlyRemaining === null || quota.monthlyRemaining <= BigInt(0))) {
        return reply.status(403).send({ error: { code: 'INSUFFICIENT_QUOTA', message: '配额不足' } });
      }

      const body = req.body;
      const channel = await prisma.modelChannel.findFirst({ where: { isActive: true }, orderBy: { priority: 'asc' } });
      if (!channel) return reply.status(503).send({ error: { code: 'UNAVAILABLE', message: '没有可用的服务渠道' } });

      const requestTime = new Date();
      const upstreamResponse = await fetch(`${channel.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${channel.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseTime = new Date();
      const responseData = await upstreamResponse.json() as any;

      const tokensUsed = responseData.usage?.total_tokens || 0;
      const quotaUsed = BigInt(tokensUsed);
      if (upstreamResponse.ok) await deductQuota(auth.userId, quotaUsed);

      await prisma.apiUsageLog.create({
        data: {
          userId: auth.userId, apiKeyId: auth.apiKeyId,
          model: (body as any)?.model || 'unknown', tokensUsed, quotaUsed,
          statusCode: upstreamResponse.status,
          error: upstreamResponse.ok ? null : JSON.stringify(responseData),
          requestTime, responseTime,
        },
      });

      return reply.status(upstreamResponse.status).send(responseData);
    } catch (error) {
      console.error('Gateway error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '代理请求失败' } });
    }
  });

  app.get('/api/v1/models', async (_req, reply) => {
    try {
      const channels = await prisma.modelChannel.findMany({
        where: { isActive: true },
        select: { id: true, name: true, displayName: true, models: true, priority: true },
        orderBy: { priority: 'asc' },
      });
      return reply.send({ channels });
    } catch (error) {
      console.error('List models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型列表失败' } });
    }
  });
}
