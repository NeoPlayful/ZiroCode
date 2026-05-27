import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '兑换码为必填项' } }, { status: 400 });
    }

    const redeemCode = await prisma.redeemCode.findUnique({ where: { code: code.toUpperCase() } });

    if (!redeemCode || !redeemCode.isActive) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '兑换码无效或已失效' } }, { status: 404 });
    }

    if (redeemCode.expiresAt && redeemCode.expiresAt < new Date()) {
      return NextResponse.json({ error: { code: 'EXPIRED', message: '兑换码已过期' } }, { status: 400 });
    }

    if (redeemCode.usedCount >= redeemCode.maxUses) {
      return NextResponse.json({ error: { code: 'EXHAUSTED', message: '兑换码已被使用完毕' } }, { status: 400 });
    }

    // 创建订阅
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.userId as string,
        type: redeemCode.type,
        quotaTotal: redeemCode.quotaAmount,
        startsAt: new Date(),
        expiresAt: redeemCode.type === 'PERMANENT' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 更新兑换码使用次数
    await prisma.redeemCode.update({
      where: { id: redeemCode.id },
      data: { usedCount: { increment: 1 } },
    });

    // 记录交易
    await prisma.transaction.create({
      data: {
        userId: session.userId as string,
        type: 'REDEEM',
        amount: 0,
        quotaAmount: redeemCode.quotaAmount,
        description: `兑换码 ${code} 充值`,
        subscriptionId: subscription.id,
        redeemCodeId: redeemCode.id,
      },
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        type: subscription.type,
        quotaTotal: Number(subscription.quotaTotal),
        quotaUsed: Number(subscription.quotaUsed),
      },
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '兑换失败' } }, { status: 500 });
  }
}
