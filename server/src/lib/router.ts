import { prisma } from './db.js';

interface RouteResult {
  channel: { id: string; name: string; baseUrl: string; apiKey: string };
  response: Response;
}

// 按优先级获取可用渠道
export async function getAvailableChannels() {
  return prisma.modelChannel.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  });
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

  for (const channel of channels) {
    try {
      const url = `${channel.baseUrl}${path}`;
      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${channel.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      // 5xx 错误尝试下一个渠道
      if (response.status >= 500 && channels.length > 1) {
        lastError = new Error(`Channel ${channel.name} returned ${response.status}`);
        continue;
      }

      return { channel: { id: channel.id, name: channel.name, baseUrl: channel.baseUrl, apiKey: channel.apiKey }, response };
    } catch (err: any) {
      lastError = err;
      console.warn(`Channel ${channel.name} failed: ${err.message}`);
      continue;
    }
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
      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${channel.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
      });

      if (!response.ok) {
        if (response.status >= 500 && channels.length > 1) continue;
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

      onDone();
      return;
    } catch (err: any) {
      console.warn(`Channel ${channel.name} streaming failed: ${err.message}`);
      continue;
    }
  }

  onError(new Error('All channels failed for streaming'));
}

export async function checkChannelHealth(channelId: string): Promise<boolean> {
  try {
    const channel = await prisma.modelChannel.findUnique({ where: { id: channelId } });
    if (!channel) return false;
    const response = await fetch(`${channel.baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${channel.apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
