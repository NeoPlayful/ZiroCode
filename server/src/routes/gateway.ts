import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { getUserQuota, deductQuota, checkRateLimit } from '../lib/quota.js';
import { routeToUpstream } from '../lib/router.js';
import { createNotification } from '../lib/notification.js';
import { dispatchWebhook } from '../lib/webhook-dispatcher.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { triggerReferralReward } from '../lib/referral.js';
import { checkApiKeyRateLimit } from '../lib/api-utils.js';

let defaultPricingCache: { inputPrice: number; outputPrice: number; cacheWritePrice: number; cacheReadPrice: number } | null = null;
let modelPricingCache: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> | null = null;
let pricingCacheTime = 0;

async function getDefaultPricing() {
  if (defaultPricingCache && Date.now() - pricingCacheTime < 60000) return defaultPricingCache;
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'default_pricing' } });
    defaultPricingCache = config?.value ? {
      inputPrice: Number((config.value as any).inputPrice) || 1,
      outputPrice: Number((config.value as any).outputPrice) || 1,
      cacheWritePrice: Number((config.value as any).cacheWritePrice) || 1,
      cacheReadPrice: Number((config.value as any).cacheReadPrice) || 1,
    } : { inputPrice: 1, outputPrice: 1, cacheWritePrice: 1, cacheReadPrice: 1 };
    pricingCacheTime = Date.now();
  } catch {
    defaultPricingCache = { inputPrice: 1, outputPrice: 1, cacheWritePrice: 1, cacheReadPrice: 1 };
  }
  return defaultPricingCache;
}

async function getModelPricing(model: string) {
  if (!modelPricingCache || Date.now() - pricingCacheTime >= 60000) {
    try {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'model_pricing' } });
      modelPricingCache = (config?.value as any) || {};
    } catch {
      modelPricingCache = {};
    }
    pricingCacheTime = Date.now();
  }
  if (modelPricingCache![model]) return modelPricingCache![model];
  for (const [key, price] of Object.entries(modelPricingCache!)) {
    if (model.startsWith(key)) return price;
  }
  return null;
}

async function calculateCost(model: string, inputTokens: number, outputTokens: number, cacheCreationTokens: number, cacheReadTokens: number, channelPricing: { inputPrice: number; outputPrice: number; cacheWritePrice: number; cacheReadPrice: number }) {
  const mp = await getModelPricing(model);
  if (mp) {
    return (inputTokens / 1_000_000 * mp.input) + (outputTokens / 1_000_000 * mp.output) + (cacheCreationTokens / 1_000_000 * mp.cacheWrite) + (cacheReadTokens / 1_000_000 * mp.cacheRead);
  }
  const ip = channelPricing.inputPrice > 0 ? channelPricing.inputPrice : (await getDefaultPricing()).inputPrice;
  const op = channelPricing.outputPrice > 0 ? channelPricing.outputPrice : (await getDefaultPricing()).outputPrice;
  const cwp = channelPricing.cacheWritePrice > 0 ? channelPricing.cacheWritePrice : (await getDefaultPricing()).cacheWritePrice;
  const crp = channelPricing.cacheReadPrice > 0 ? channelPricing.cacheReadPrice : (await getDefaultPricing()).cacheReadPrice;
  return (inputTokens / 1_000_000 * ip) + (outputTokens / 1_000_000 * op) + (cacheCreationTokens / 1_000_000 * cwp) + (cacheReadTokens / 1_000_000 * crp);
}

async function validateApiKey(authHeader: string | null): Promise<{ userId: string; apiKeyId: string; rateLimit: number | null } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer sk-')) return null;
  const key = authHeader.replace('Bearer ', '');
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return { userId: apiKey.userId, apiKeyId: apiKey.id, rateLimit: apiKey.rateLimit ?? null };
}

async function logUsage(auth: { userId: string; apiKeyId: string }, model: string, tokensUsed: number, quotaUsed: bigint, inputTokens: number, outputTokens: number, cacheCreationTokens: number, cacheReadTokens: number, cost: number | null, statusCode: number, error: string | null, requestTime: Date, responseTime: Date, channelId?: string, clientIp?: string, routePath?: string, requestPath?: string) {
  const latencyMs = responseTime.getTime() - requestTime.getTime();
  await prisma.apiUsageLog.create({
    data: {
      userId: auth.userId, apiKeyId: auth.apiKeyId,
      model, tokensUsed, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, quotaUsed,
      statusCode, error, channelId,
      latencyMs, clientIp, routePath, requestPath,
      requestTime, responseTime, cost,
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
        select: { id: true, path: true, mode: true, primaryChannelId: true, backupChannelId: true, activeChannel: true, channelIds: true, strategy: true, billingMultiplier: true },
      });

      const matchedPath = matchRoute(routes, urlPath);
      if (!matchedPath) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `No route matching "${urlPath}"` } });
      }

      const matchedRouteInfo = routes.find(r => r.path === matchedPath);
      const billingMultiplier = matchedRouteInfo?.billingMultiplier || 1.0;

      // 认证
      const auth = await validateApiKey((req as any).headers.authorization || null);
      if (!auth) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '无效的 API Key' } });

      // 全局速率限制
      const allowed = await checkRateLimit(auth.userId);
      if (!allowed) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: '请求过于频繁' } });

      // API Key 独立速率限制
      if (auth.rateLimit && auth.rateLimit > 0) {
        const keyAllowed = await checkApiKeyRateLimit(auth.apiKeyId, auth.rateLimit);
        if (!keyAllowed) return reply.status(429).send({ error: { code: 'KEY_RATE_LIMITED', message: '该 API Key 请求过于频繁' } });
      }

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
        let inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0;
        let hasError = false;
        let streamChannelId: string | undefined;
        let streamPricing = { inputPrice: 0, outputPrice: 0, cacheWritePrice: 0, cacheReadPrice: 0 };
        try {
          const result = await routeToUpstream(upstreamPath, {
            method: (req as any).method,
            headers: { Authorization: '' },
            body: JSON.stringify(body),
          });
          streamChannelId = result.channel.id;
          streamPricing = result.channel;
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
                try { const parsed = JSON.parse(data); const u = parsed.usage; if (u) { totalTokens = u.total_tokens || totalTokens; inputTokens = u.prompt_tokens || inputTokens; outputTokens = u.completion_tokens || outputTokens; cacheReadTokens = u.prompt_tokens_details?.cached_tokens || cacheReadTokens; cacheCreationTokens = u.cache_creation_input_tokens || cacheCreationTokens; } } catch {}
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
        const quotaUsed = BigInt(Math.ceil(totalTokens * billingMultiplier));
        if (!hasError && totalTokens > 0) {
          await deductQuota(auth.userId, quotaUsed);
          triggerReferralReward(auth.userId, quotaUsed).catch(() => {});
          const newQuota = await getUserQuota(auth.userId);
          const total = newQuota.payAsYouGoTotal + (newQuota.monthlyTotal || BigInt(0));
          const remaining = newQuota.payAsYouGoRemaining + (newQuota.monthlyRemaining || BigInt(0));
          if (total > BigInt(0) && remaining * BigInt(10) < total) {
            createNotification(auth.userId, 'QUOTA_LOW', '配额即将用完', '剩余配额不足 10%，请及时充值', '/subscription').catch(() => {});
            dispatchWebhook(auth.userId, 'QUOTA_LOW', { quotaRemaining: Number(remaining), quotaTotal: Number(total), percentageUsed: Number((total - remaining) * BigInt(100) / total) }).catch(() => {});
          }
        }
        const cost = await calculateCost(body?.model || 'unknown', inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, streamPricing);
        await logUsage(auth, body?.model || 'unknown', totalTokens, quotaUsed, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, cost > 0 ? cost : null, hasError ? 500 : 200, hasError ? 'Streaming failed' : null, requestTime, responseTime, streamChannelId, (req as any).ip, matchedPath, urlPath);
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
      const usage = responseData.usage || {};
      const tokensUsed = usage.total_tokens || 0;
      const inputTokens = usage.prompt_tokens || 0;
      const outputTokens = usage.completion_tokens || 0;
      const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens || 0;
      const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
      const cost = await calculateCost(body?.model || 'unknown', inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, result.channel);
      const quotaUsed = BigInt(Math.ceil(tokensUsed * billingMultiplier));
      if (result.response.ok) {
        await deductQuota(auth.userId, quotaUsed);
        triggerReferralReward(auth.userId, quotaUsed).catch(() => {});
        const newQuota = await getUserQuota(auth.userId);
        const total = newQuota.payAsYouGoTotal + (newQuota.monthlyTotal || BigInt(0));
        const remaining = newQuota.payAsYouGoRemaining + (newQuota.monthlyRemaining || BigInt(0));
        if (total > BigInt(0) && remaining * BigInt(10) < total) {
          createNotification(auth.userId, 'QUOTA_LOW', '配额即将用完', '剩余配额不足 10%，请及时充值', '/subscription').catch(() => {});
          dispatchWebhook(auth.userId, 'QUOTA_LOW', { quotaRemaining: Number(remaining), quotaTotal: Number(total), percentageUsed: Number((total - remaining) * BigInt(100) / total) }).catch(() => {});
        }
      }
      await logUsage(auth, body?.model || 'unknown', tokensUsed, quotaUsed, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, cost > 0 ? cost : null, result.response.status, result.response.ok ? null : JSON.stringify(responseData), requestTime, responseTime, usedChannelId, (req as any).ip, matchedPath, urlPath);
      return reply.status(result.response.status).send(responseData);
    } catch (error: any) {
      console.error('Gateway error:', error);
      if (error.isTimeout) {
        return reply.status(504).send({ error: { code: 'UPSTREAM_TIMEOUT', message: '上游请求超时，请稍后重试' } });
      }
      return reply.status(500).send({ error: { code: 'INTERNAL', message: error.message || '代理请求失败' } });
    }
  });
}
