import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserQuota, deductQuota, checkRateLimit } from '@/lib/quota';

async function validateApiKey(authHeader: string | null): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer sk-')) return null;
  const key = authHeader.replace('Bearer ', '');
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.isActive) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: apiKey.userId, apiKeyId: apiKey.id };
}

export async function POST(req: NextRequest) {
  try {
    // 1. 验证 API Key
    const auth = await validateApiKey(req.headers.get('authorization'));
    if (!auth) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '无效的 API Key' } }, { status: 401 });
    }

    // 2. 限流检查
    const allowed = await checkRateLimit(auth.userId);
    if (!allowed) {
      return NextResponse.json({ error: { code: 'RATE_LIMITED', message: '请求过于频繁' } }, { status: 429 });
    }

    // 3. 检查配额
    const quota = await getUserQuota(auth.userId);
    if (quota.payAsYouGoRemaining <= BigInt(0) && (quota.monthlyRemaining === null || quota.monthlyRemaining <= BigInt(0))) {
      return NextResponse.json({ error: { code: 'INSUFFICIENT_QUOTA', message: '配额不足' } }, { status: 403 });
    }

    // 4. 获取请求体
    const body = await req.json();

    // 5. 获取渠道配置
    const channel = await prisma.modelChannel.findFirst({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    if (!channel) {
      return NextResponse.json({ error: { code: 'UNAVAILABLE', message: '没有可用的服务渠道' } }, { status: 503 });
    }

    const requestTime = new Date();

    // 6. 转发到上游
    const upstreamResponse = await fetch(`${channel.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channel.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseTime = new Date();
    const responseData = await upstreamResponse.json();

    // 7. 计算用量并扣减配额
    const tokensUsed = responseData.usage?.total_tokens || 0;
    const quotaUsed = BigInt(tokensUsed);

    if (upstreamResponse.ok) {
      await deductQuota(auth.userId, quotaUsed);
    }

    // 8. 记录日志
    await prisma.apiUsageLog.create({
      data: {
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        model: body.model || 'unknown',
        tokensUsed,
        quotaUsed,
        statusCode: upstreamResponse.status,
        error: upstreamResponse.ok ? null : JSON.stringify(responseData),
        requestTime,
        responseTime,
      },
    });

    return NextResponse.json(responseData, { status: upstreamResponse.status });
  } catch (error) {
    console.error('Gateway error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '代理请求失败' } }, { status: 500 });
  }
}
