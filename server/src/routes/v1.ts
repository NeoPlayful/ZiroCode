import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { getUserQuota, deductQuota, checkRateLimit } from '../lib/quota.js';
import { routeToUpstream, getAvailableChannels } from '../lib/router.js';

async function validateApiKey(authHeader: string | null): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer sk-')) return null;
  const key = authHeader.replace('Bearer ', '');
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

async function logUsage(auth: { userId: string; apiKeyId: string }, model: string, tokensUsed: number, quotaUsed: bigint, statusCode: number, error: string | null, requestTime: Date, responseTime: Date) {
  await prisma.apiUsageLog.create({
    data: {
      userId: auth.userId, apiKeyId: auth.apiKeyId,
      model, tokensUsed, quotaUsed,
      statusCode, error,
      requestTime, responseTime,
    },
  });
}

export async function v1Routes(app: FastifyInstance) {
  // 聊天补全 - 普通 JSON 模式
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

      const body = req.body as any;
      const requestTime = new Date();
      const isStream = body?.stream === true;

      if (isStream) {
        // SSE 流式模式
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        let totalTokens = 0;
        let hasError = false;

        try {
          const result = await routeToUpstream('/chat/completions', {
            method: 'POST',
            headers: { Authorization: '' }, // router handles auth
            body: JSON.stringify(body),
          });

          const reader = result.response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  reply.raw.write('data: [DONE]\n\n');
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  totalTokens = parsed.usage?.total_tokens || totalTokens;
                } catch {}
                reply.raw.write(`data: ${data}\n\n`);
              }
            }
          }
          reply.raw.end();
        } catch (err: any) {
          hasError = true;
          reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          reply.raw.end();
        }

        const responseTime = new Date();
        const quotaUsed = BigInt(totalTokens);
        if (!hasError && totalTokens > 0) await deductQuota(auth.userId, quotaUsed);
        await logUsage(auth, body?.model || 'unknown', totalTokens, quotaUsed, hasError ? 500 : 200, hasError ? 'Streaming failed' : null, requestTime, responseTime);
        return;
      }

      // 普通 JSON 模式 - 多渠道支持
      const result = await routeToUpstream('/chat/completions', {
        method: 'POST',
        headers: { Authorization: '' },
        body: JSON.stringify(body),
      });

      const responseTime = new Date();
      const responseData = await result.response.json() as any;

      const tokensUsed = responseData.usage?.total_tokens || 0;
      const quotaUsed = BigInt(tokensUsed);
      if (result.response.ok) await deductQuota(auth.userId, quotaUsed);

      await logUsage(auth, body?.model || 'unknown', tokensUsed, quotaUsed, result.response.status, result.response.ok ? null : JSON.stringify(responseData), requestTime, responseTime);

      return reply.status(result.response.status).send(responseData);
    } catch (error: any) {
      console.error('Gateway error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: error.message || '代理请求失败' } });
    }
  });

  // 模型列表
  app.get('/api/v1/models', async (_req, reply) => {
    try {
      const channels = await getAvailableChannels();
      const models = channels.flatMap(c => c.models.map(m => ({
        id: m, object: 'model', created: Math.floor(c.createdAt.getTime() / 1000), owned_by: c.name,
      })));
      return reply.send({ object: 'list', data: models });
    } catch (error) {
      console.error('List models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型列表失败' } });
    }
  });
}
