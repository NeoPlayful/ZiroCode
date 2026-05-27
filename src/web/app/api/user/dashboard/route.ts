import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserQuota } from '@/lib/quota';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const userId = session.userId as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '用户不存在' } }, { status: 404 });
    }

    const quota = await getUserQuota(userId);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        type: true,
        quotaTotal: true,
        quotaUsed: true,
        quotaMonthly: true,
        quotaMonthlyUsed: true,
        expiresAt: true,
        startsAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      user,
      quota: {
        payAsYouGo: {
          total: Number(quota.payAsYouGoTotal),
          used: Number(quota.payAsYouGoUsed),
          remaining: Number(quota.payAsYouGoRemaining),
        },
        monthly: {
          total: quota.monthlyTotal ? Number(quota.monthlyTotal) : null,
          used: Number(quota.monthlyUsed),
          remaining: quota.monthlyRemaining ? Number(quota.monthlyRemaining) : null,
        },
      },
      subscriptions,
      hasActiveSubscription: quota.hasActiveSubscription,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取仪表板数据失败' } }, { status: 500 });
  }
}
