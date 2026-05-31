import { prisma } from './db.js';
import { SocksProxyAgent } from 'socks-proxy-agent';
import http from 'http';
import https from 'https';

// SOCKS5 代理 Agent 缓存
const proxyAgentCache = new Map<string, SocksProxyAgent>();

function getProxyAgent(proxyUrl: string): SocksProxyAgent | undefined {
  if (!proxyUrl) return undefined;
  if (!proxyAgentCache.has(proxyUrl)) {
    proxyAgentCache.set(proxyUrl, new SocksProxyAgent(proxyUrl));
  }
  return proxyAgentCache.get(proxyUrl);
}

// 通过代理发起 HTTP 请求（兼容 SOCKS5）
function proxyFetch(url: string, options: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }, proxyUrl: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const agent = getProxyAgent(proxyUrl);
    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: options.method, headers: options.headers, agent, signal: options.signal }, (res) => resolve(res));
    req.on('error', reject);
    if (options.signal) {
      options.signal.addEventListener('abort', () => { req.destroy(); reject(Object.assign(new Error('Request timed out'), { name: 'TimeoutError' })); }, { once: true });
    }
    if (options.body) req.write(options.body);
    req.end();
  });
}

// 将 IncomingMessage 包装为 Response 对象
function incomingMessageToResponse(incoming: http.IncomingMessage): Response {
  const headers: Record<string, string> = {};
  if (incoming.rawHeaders) {
    for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
      headers[incoming.rawHeaders[i].toLowerCase()] = incoming.rawHeaders[i + 1];
    }
  }
  const body = new ReadableStream({
    start(controller) {
      incoming.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      incoming.on('end', () => controller.close());
      incoming.on('error', (err) => controller.error(err));
    },
  });
  return new Response(body, {
    status: incoming.statusCode || 500,
    statusText: incoming.statusMessage || 'Error',
    headers,
  });
}

let cachedTimeout: number | null = null;
let timeoutCacheTime = 0;

async function getUpstreamTimeout(): Promise<number> {
  if (cachedTimeout !== null && Date.now() - timeoutCacheTime < 60000) return cachedTimeout;
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'upstream_timeout' } });
    const val = config?.value !== null && config?.value !== undefined ? Number(config.value) : 0;
    cachedTimeout = val > 0 ? val * 1000 : 0;
    timeoutCacheTime = Date.now();
  } catch {
    cachedTimeout = 0;
  }
  return cachedTimeout;
}

interface RouteResult {
  channel: { id: string; name: string; baseUrl: string; apiKey: string; inputPrice: number; outputPrice: number; cacheWritePrice: number; cacheReadPrice: number };
  response: Response;
}

interface HealthCheckResult {
  healthy: boolean;
  statusCode?: number;
  message: string;
  error?: string;
}

// In-memory failure tracking for auto fault detection
const failureCounts: Record<string, { count: number; coolingUntil: number | null }> = {};
const CONSECUTIVE_FAILURE_THRESHOLD = 3;
const COOLING_PERIOD_MS = 60000; // 60 seconds

// Determine health check path based on baseUrl
function getHealthCheckPath(baseUrl: string): string {
  const url = baseUrl.toLowerCase();
  if (url.includes('openai') || url.includes('api.openai')) return '/models';
  if (url.includes('claude') || url.includes('anthropic')) return '/v1/models';
  return '/v1/models'; // default for most providers
}

// Mark channel unhealthy in DB
async function markChannelUnhealthy(channelId: string) {
  await prisma.modelChannel.update({
    where: { id: channelId },
    data: { healthStatus: 'UNHEALTHY', lastHealthCheckAt: new Date() },
  });
}

// Mark channel healthy in DB
async function markChannelHealthy(channelId: string) {
  await prisma.modelChannel.update({
    where: { id: channelId },
    data: { healthStatus: 'HEALTHY', lastHealthCheckAt: new Date() },
  });
}

// Reset failure count for a channel
function resetFailureCount(channelId: string) {
  delete failureCounts[channelId];
}

// Record a failure and check if threshold reached
async function recordFailure(channelId: string) {
  if (!failureCounts[channelId]) {
    failureCounts[channelId] = { count: 0, coolingUntil: null };
  }
  failureCounts[channelId].count++;

  if (failureCounts[channelId].count >= CONSECUTIVE_FAILURE_THRESHOLD) {
    failureCounts[channelId].coolingUntil = Date.now() + COOLING_PERIOD_MS;
    await markChannelUnhealthy(channelId);
  }
}

// Check if channel is in cooling period and should be re-checked
function isInCooling(channelId: string): boolean {
  const record = failureCounts[channelId];
  if (!record || !record.coolingUntil) return false;
  if (Date.now() >= record.coolingUntil) {
    // Cooling period expired, reset and allow retry
    delete failureCounts[channelId];
    return false;
  }
  return true;
}

// 按优先级获取可用渠道（过滤 UNHEALTHY 和冷却中的渠道）
export async function getAvailableChannels() {
  const channels = await prisma.modelChannel.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  });

  // Filter out channels in cooling period
  const available = channels.filter(c => {
    if (c.healthStatus === 'UNHEALTHY') {
      if (isInCooling(c.id)) return false;
      prisma.modelChannel.update({
        where: { id: c.id },
        data: { healthStatus: 'UNKNOWN' },
      }).catch(() => {});
      return true;
    }
    return true;
  });

  // Normalize baseUrl: strip trailing slash
  return available.map(c => ({
    ...c,
    baseUrl: c.baseUrl.replace(/\/+$/, ''),
  }));
}

// 应用模型重定向
function applyModelRedirect(body: string | undefined, modelRedirect: unknown): string | undefined {
  if (!body || !modelRedirect) return body;
  try {
    const redirectMap = modelRedirect as Record<string, string>;
    if (Object.keys(redirectMap).length === 0) return body;
    const parsed = JSON.parse(body);
    if (parsed.model && redirectMap[parsed.model]) {
      parsed.model = redirectMap[parsed.model];
      return JSON.stringify(parsed);
    }
  } catch {}
  return body;
}

// 透明代理到上游，支持故障转移
export async function routeToUpstream(
  path: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<RouteResult> {
  const channels = await getAvailableChannels();
  if (channels.length === 0) {
    throw new Error('No available channels');
  }

  let lastError: Error | null = null;
  let lastChannelId: string | null = null;
  let hasTimeout = false;

  for (const channel of channels) {
    lastChannelId = channel.id;
    try {
      const url = `${channel.baseUrl}${path}`;
      const timeout = (channel as any).timeout > 0 ? (channel as any).timeout * 1000 : await getUpstreamTimeout();
      const proxyUrl = (channel as any).proxyUrl || '';
      const channelHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${channel.apiKey}`,
      };
      const requestBody = applyModelRedirect(options.body, (channel as any).modelRedirect);
      const signal = timeout > 0 ? AbortSignal.timeout(timeout) : undefined;

      let response: Response;
      if (proxyUrl) {
        const proxyRes = await proxyFetch(url, { method: options.method, headers: channelHeaders, body: requestBody, signal }, proxyUrl);
        response = incomingMessageToResponse(proxyRes);
      } else {
        const fetchOptions: RequestInit & { signal?: AbortSignal } = {
          method: options.method,
          headers: channelHeaders,
          body: requestBody,
        };
        if (signal) fetchOptions.signal = signal;
        response = await fetch(url, fetchOptions);
      }

      // 5xx 错误尝试下一个渠道
      if (response.status >= 500 && channels.length > 1) {
        lastError = new Error(`Channel ${channel.name} returned ${response.status}`);
        await recordFailure(channel.id);
        continue;
      }

      // Success - reset failure count
      resetFailureCount(channel.id);
      return { channel: { id: channel.id, name: channel.name, baseUrl: channel.baseUrl, apiKey: channel.apiKey, inputPrice: Number(channel.inputPrice), outputPrice: Number(channel.outputPrice), cacheWritePrice: Number(channel.cacheWritePrice), cacheReadPrice: Number(channel.cacheReadPrice) }, response };
    } catch (err: any) {
      lastError = err;
      if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') hasTimeout = true;
      console.warn(`Channel ${channel.name} failed: ${err.message}`);
      await recordFailure(channel.id);
      continue;
    }
  }

  if (hasTimeout) {
    throw Object.assign(new Error('All channels timed out'), { isTimeout: true, statusCode: 504 });
  }
  throw lastError || new Error('All channels failed');
}

// SSE 流式代理
export async function routeToUpstreamStreaming(
  path: string,
  options: { method: string; headers: Record<string, string>; body?: string },
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  const channels = await getAvailableChannels();
  if (channels.length === 0) {
    onError(new Error('No available channels'));
    return;
  }

  for (const channel of channels) {
    try {
      const url = `${channel.baseUrl}${path}`;
      const proxyUrl = (channel as any).proxyUrl || '';
      const channelHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${channel.apiKey}`,
      };
      const requestBody = applyModelRedirect(options.body, (channel as any).modelRedirect);

      let response: Response;
      if (proxyUrl) {
        const proxyRes = await proxyFetch(url, { method: options.method, headers: channelHeaders, body: requestBody }, proxyUrl);
        response = incomingMessageToResponse(proxyRes);
      } else {
        response = await fetch(url, {
          method: options.method,
          headers: channelHeaders,
          body: requestBody,
        });
      }

      if (!response.ok) {
        if (response.status >= 500 && channels.length > 1) {
          await recordFailure(channel.id);
          continue;
        }
        onError(new Error(`Channel ${channel.name} returned ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { onError(new Error('No response body')); return; }

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
            onChunk(line.slice(6));
          }
        }
      }

      resetFailureCount(channel.id);
      onDone();
      return;
    } catch (err: any) {
      console.warn(`Channel ${channel.name} streaming failed: ${err.message}`);
      await recordFailure(channel.id);
      continue;
    }
  }

  onError(new Error('All channels failed for streaming'));
}

// 健康检查 - 返回详细信息并更新数据库
export async function checkChannelHealth(channelId: string): Promise<HealthCheckResult> {
  try {
    const channel = await prisma.modelChannel.findUnique({ where: { id: channelId } });
    if (!channel) return { healthy: false, message: '渠道不存在' };

    const healthPath = getHealthCheckPath(channel.baseUrl);
    const url = `${channel.baseUrl}${healthPath}`;
    const proxyUrl = (channel as any).proxyUrl || '';

    let response: Response;
    if (proxyUrl) {
      const proxyRes = await proxyFetch(url, { method: 'GET', headers: { Authorization: `Bearer ${channel.apiKey}` }, signal: AbortSignal.timeout(10000) }, proxyUrl);
      // Await full body so proxyRes is fully consumed before returning
      const bodyChunks: Buffer[] = [];
      for await (const chunk of proxyRes) bodyChunks.push(chunk);
      response = new Response(Buffer.concat(bodyChunks), {
        status: proxyRes.statusCode || 500,
        statusText: proxyRes.statusMessage || 'Error',
      });
    } else {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${channel.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
    }

    if (response.ok) {
      await markChannelHealthy(channelId);
      resetFailureCount(channelId);
      return {
        healthy: true,
        statusCode: response.status,
        message: '连接正常',
      };
    } else {
      await markChannelUnhealthy(channelId);
      return {
        healthy: false,
        statusCode: response.status,
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: `Health check to ${healthPath} returned ${response.status}`,
      };
    }
  } catch (err: any) {
    await markChannelUnhealthy(channelId);
    if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return { healthy: false, message: '连接超时', error: 'Request timed out after 10s' };
    }
    return { healthy: false, message: `连接失败: ${err.message}`, error: err.message };
  }
}

// 定时健康巡检
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduledHealthChecks(intervalMs = 300000) {
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  healthCheckInterval = setInterval(async () => {
    try {
      const channels = await prisma.modelChannel.findMany({ where: { isActive: true } });
      for (const channel of channels) {
        checkChannelHealth(channel.id).catch(err =>
          console.warn(`Scheduled health check failed for ${channel.name}:`, err.message)
        );
      }
    } catch (err) {
      console.error('Scheduled health check error:', err);
    }
  }, intervalMs);
}

export function stopScheduledHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}
