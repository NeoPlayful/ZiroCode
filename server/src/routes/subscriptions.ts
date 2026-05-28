import type { FastifyInstance } from 'fastify';
import { verifySession, COOKIE_NAME } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { triggerReferralReward } from '../lib/referral.js';

export async function subscriptionRoutes(app: FastifyInstance) {
  app.get('/api/subscriptions', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const subscriptions = await prisma.subscription.findMany({
        where: { userId: session.userId as string },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, quotaTotal: true, quotaUsed: true, quotaMonthly: true, quotaMonthlyUsed: true, isActive: true, expiresAt: true, startsAt: true, lastResetAt: true },
      });
      return reply.send({ subscriptions });
    } catch (error) {
      console.error('List subscriptions error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取订阅列表失败' } });
    }
  });

  app.get('/api/subscriptions/plans', async (req, reply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
        select: { id: true, name: true, type: true, price: true, quotaAmount: true, durationDays: true },
      });
      return reply.send({ plans });
    } catch (error) {
      console.error('List plans error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取套餐列表失败' } });
    }
  });

  app.post('/api/subscriptions/buy', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { planId } = req.body as { planId?: string };
      if (!planId) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '套餐ID为必填项' } });

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '套餐不存在或已下架' } });

      const expiresAt = plan.type === 'PERMANENT' ? null : plan.durationDays ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000) : null;
      const subscription = await prisma.subscription.create({
        data: {
          userId: session.userId as string,
          type: plan.type,
          quotaTotal: plan.quotaAmount,
          quotaMonthly: plan.type === 'MONTHLY' ? plan.quotaAmount : null,
          startsAt: new Date(),
          expiresAt,
        },
      });

      await prisma.transaction.create({
        data: {
          userId: session.userId as string,
          type: 'PURCHASE',
          amount: plan.price,
          quotaAmount: plan.quotaAmount,
          description: `购买套餐：${plan.name}`,
          subscriptionId: subscription.id,
        },
      });

      return reply.send({
        subscription: { id: subscription.id, type: subscription.type, quotaTotal: Number(subscription.quotaTotal), expiresAt: subscription.expiresAt },
      });
    } catch (error) {
      console.error('Buy subscription error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '购买订阅失败' } });
    }
  });

  app.post('/api/subscriptions/redeem', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { code } = req.body as any;
      if (!code) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '兑换码为必填项' } });

      const redeemCode = await prisma.redeemCode.findUnique({ where: { code: code.toUpperCase() } });
      if (!redeemCode || !redeemCode.isActive) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '兑换码无效或已失效' } });
      if (redeemCode.expiresAt && redeemCode.expiresAt < new Date()) return reply.status(400).send({ error: { code: 'EXPIRED', message: '兑换码已过期' } });
      if (redeemCode.usedCount >= redeemCode.maxUses) return reply.status(400).send({ error: { code: 'EXHAUSTED', message: '兑换码已被使用完毕' } });

      const subscription = await prisma.subscription.create({
        data: {
          userId: session.userId as string,
          type: redeemCode.type,
          quotaTotal: redeemCode.quotaAmount,
          startsAt: new Date(),
          expiresAt: redeemCode.type === 'PERMANENT' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.redeemCode.update({ where: { id: redeemCode.id }, data: { usedCount: { increment: 1 } } });
      await prisma.transaction.create({
        data: {
          userId: session.userId as string,
          type: 'REDEEM', amount: 0, quotaAmount: redeemCode.quotaAmount,
          description: `兑换码 ${code} 充值`,
          subscriptionId: subscription.id, redeemCodeId: redeemCode.id,
        },
      });

      // 触发推荐奖励（不阻塞响应）
      triggerReferralReward(session.userId as string, redeemCode.quotaAmount).catch(() => {});

      return reply.send({
        subscription: { id: subscription.id, type: subscription.type, quotaTotal: Number(subscription.quotaTotal), quotaUsed: Number(subscription.quotaUsed) },
      });
    } catch (error) {
      console.error('Redeem error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '兑换失败' } });
    }
  });
}
