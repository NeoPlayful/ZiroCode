import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { getUserQuota, deductQuota, checkRateLimit } from '../lib/quota.js';
import { routeToUpstream } from '../lib/router.js';
import { createNotification } from '../lib/notification.js';
import { dispatchWebhook } from '../lib/webhook-dispatcher.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { triggerReferralReward } from '../lib/referral.js';

async function validateApiKey(authHeader: string | null): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer sk-')) return null;
  const key = authHeader.replace('Bearer ', '');
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

async function logUsage(auth: { userId: string; apiKeyId: string }, model: string, tokensUsed: number, quotaUsed: bigint, statusCode: number, error: string | null, requestTime: Date, responseTime: Date, channelId?: string) {
  await prisma.apiUsageLog.create({
    data: {
      userId: auth.userId, apiKeyId: auth.apiKeyId,
      model, tokensUsed, quotaUsed,
      statusCode, error, channelId,
      requestTime, responseTime,
    },
  });
}

async function getCachedQuota(userId: string) {
  const cached = await cacheGet(`quota:${userId}`);
  if (cached) return JSON.parse(cached);
  const quota = await getUserQuota(userId);
  const serialized = {
    payAsYouGoTotal: Number(quota.payAsYouGoTotal),
    payAsYouGoUsed: Number(quota.payAsYouGoUsed),
    payAsYouGoRemaining: Number(quota.payAsYouGoRemaining),
    monthlyTotal: quota.monthlyTotal ? Number(quota.monthlyTotal) : null,
    monthlyUsed: Number(quota.monthlyUsed),
    monthlyRemaining: quota.monthlyRemaining ? Number(quota.monthlyRemaining) : null,
  };
  await cacheSet(`quota:${userId}`, JSON.stringify(serialized), 30);
  return serialized;
}

function matchRoute(routes: { path: string }[], urlPath: string): string | null {
  let bestMatch: string | null = null;
  for (const route of routes) {
    if (urlPath.startsWith(route.path)) {
      if (!bestMatch || route.path.length > bestMatch.length) {
        bestMatch = route.path;
      }
    }
  }
  return bestMatch;
}

export async function gatewayRoutes(app: FastifyInstance) {
  app.setNotFoundHandler(async (req, reply) => {
    try {
      const urlPath = (req as any).url.split('?')[0];

      // 只处理非 /api/ 路径（路径路由）
      if (urlPath.startsWith('/api/')) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      // 最长前缀匹配路由
      const routes = await prisma.apiRoute.findMany({
        where: { isActive: true },
        select: { id: true, path: true, mode: true, primaryChannelId: true, backupChannelId: true, activeChannel: true, channelIds: true, strategy: true },
      });

      const matchedPath = matchRoute(routes, urlPath);
      if (!matchedPath) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `No route matching "${urlPath}"` } });
      }

      // 认证
      const auth = await validateApiKey((req as any).headers.authorization || null);
      if (!auth) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '无效的 API Key' } });

      // 速率限制
      const allowed = await checkRateLimit(auth.userId);
      if (!allowed) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: '请求过于频繁' } });

      // 配额检查
      const quota = await getCachedQuota(auth.userId);
      if (quota.payAsYouGoRemaining <= 0 && (quota.monthlyRemaining === null || quota.monthlyRemaining <= 0)) {
        createNotification(auth.userId, 'QUOTA_EXHAUSTED', '配额已用完', '请充值或兑换订阅以继续使用', '/subscription').catch(() => {});
        dispatchWebhook(auth.userId, 'QUOTA_EXHAUSTED', { quotaRemaining: 0 }).catch(() => {});
        return reply.status(403).send({ error: { code: 'INSUFFICIENT_QUOTA', message: '配额不足' } });
      }

      const body = (req as any).body as any;
      const requestTime = new Date();
      // 去掉路由前缀，剩余部分作为上游路径
      let upstreamPath = urlPath.slice(matchedPath.length) || '/';
      // 服务层加 /v1 前缀（如果上游路径尚未包含）
      if (!upstreamPath.startsWith('/v1')) {
        upstreamPath = '/v1' + upstreamPath;
      }
      const isStream = body?.stream === true;

      if (isStream) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        let totalTokens = 0;
        let hasError = false;
        let streamChannelId: string | undefined;
        try {
          const result = await routeToUpstream(upstreamPath, {
            method: (req as any).method,
            headers: { Authorization: '' },
            body: JSON.stringify(body),
          });
          streamChannelId = result.channel.id;
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
                if (data === '[DONE]') { reply.raw.write('data: [DONE]\n\n'); continue; }
                try { const parsed = JSON.parse(data); totalTokens = parsed.usage?.total_tokens || totalTokens; } catch {}
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
        if (!hasError && totalTokens > 0) {
          await deductQuota(auth.userId, quotaUsed);
          triggerReferralReward(auth.userId, quotaUsed).catch(() => {});
        }
        await logUsage(auth, body?.model || 'unknown', totalTokens, quotaUsed, hasError ? 500 : 200, hasError ? 'Streaming failed' : null, requestTime, responseTime, streamChannelId);
        return;
      }

      // 普通 JSON 模式
      const result = await routeToUpstream(upstreamPath, {
        method: (req as any).method,
        headers: { Authorization: '' },
        body: JSON.stringify(body),
      });
      const usedChannelId = result.channel.id;
      const responseTime = new Date();
      const responseData = await result.response.json() as any;
      const tokensUsed = responseData.usage?.total_tokens || 0;
      const quotaUsed = BigInt(tokensUsed);
      if (result.response.ok) {
        await deductQuota(auth.userId, quotaUsed);
        triggerReferralReward(auth.userId, quotaUsed).catch(() => {});
      }
      await logUsage(auth, body?.model || 'unknown', tokensUsed, quotaUsed, result.response.status, result.response.ok ? null : JSON.stringify(responseData), requestTime, responseTime, usedChannelId);
      return reply.status(result.response.status).send(responseData);
    } catch (error: any) {
      console.error('Gateway error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: error.message || '代理请求失败' } });
    }
  });
}
