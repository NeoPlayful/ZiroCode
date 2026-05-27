import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.userId as string },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        quotaTotal: true,
        quotaUsed: true,
        quotaMonthly: true,
        quotaMonthlyUsed: true,
        isActive: true,
        expiresAt: true,
        startsAt: true,
        lastResetAt: true,
      },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('List subscriptions error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取订阅列表失败' } }, { status: 500 });
  }
}
