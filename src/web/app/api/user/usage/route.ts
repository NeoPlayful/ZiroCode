import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const usageLogs = await prisma.apiUsageLog.findMany({
      where: { userId: session.userId as string },
      orderBy: { requestTime: 'desc' },
      take: 100,
      select: {
        id: true,
        model: true,
        tokensUsed: true,
        quotaUsed: true,
        statusCode: true,
        requestTime: true,
      },
    });

    // 按日期聚合
    const dailyMap = new Map<string, { tokens: number; quota: number; calls: number }>();
    for (const log of usageLogs) {
      const day = log.requestTime.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) || { tokens: 0, quota: 0, calls: 0 };
      entry.tokens += log.tokensUsed;
      entry.quota += Number(log.quotaUsed);
      entry.calls += 1;
      dailyMap.set(day, entry);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 按模型聚合
    const modelMap = new Map<string, { tokens: number; calls: number }>();
    for (const log of usageLogs) {
      const entry = modelMap.get(log.model) || { tokens: 0, calls: 0 };
      entry.tokens += log.tokensUsed;
      entry.calls += 1;
      modelMap.set(log.model, entry);
    }
    const byModel = Array.from(modelMap.entries()).map(([model, data]) => ({ model, ...data }));

    return NextResponse.json({
      total: {
        calls: usageLogs.length,
        tokens: usageLogs.reduce((s, l) => s + l.tokensUsed, 0),
        quota: Number(usageLogs.reduce((s, l) => s + l.quotaUsed, BigInt(0))),
      },
      daily,
      byModel,
      recent: usageLogs.slice(0, 20),
    });
  } catch (error) {
    console.error('Usage error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取使用统计失败' } }, { status: 500 });
  }
}
