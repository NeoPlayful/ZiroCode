import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getUserQuota } from '@/lib/quota';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const quota = await getUserQuota(session.userId as string);

    return NextResponse.json({
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
      hasActiveSubscription: quota.hasActiveSubscription,
    });
  } catch (error) {
    console.error('Quota error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取配额信息失败' } }, { status: 500 });
  }
}
