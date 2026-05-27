import type { FastifyInstance } from 'fastify';
import { getStripe } from '../lib/stripe.js';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';
import { triggerReferralReward } from '../lib/referral.js';

export async function paymentRoutes(app: FastifyInstance) {
  // 创建 Stripe Checkout 会话
  app.post('/api/payments/create-checkout', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { planId } = req.body as any;

      if (!planId) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '请选择套餐' } });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.isActive) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '套餐不存在或已下架' } });
      }

      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price_data: {
          currency: 'cny',
          product_data: { name: plan.name },
          unit_amount: Math.round(Number(plan.price) * 100),
        }, quantity: 1 }],
        client_reference_id: user.userId,
        metadata: { planId: plan.id, planType: plan.type, quotaAmount: plan.quotaAmount.toString() },
        success_url: `${req.headers.origin}/dashboard?payment=success`,
        cancel_url: `${req.headers.origin}/pricing?payment=cancelled`,
      });

      return reply.send({ url: session.url });
    } catch (error) {
      console.error('Create checkout error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建支付会话失败' } });
    }
  });

  // Stripe Webhook（无需认证）
  app.post('/api/payments/webhook', {
    config: { rawBody: true },
  }, async (req, reply) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!sig || !rawBody) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing signature' } });
      }

      const stripeClient = getStripe();
      const event = stripeClient.webhooks.constructEvent(
        rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.client_reference_id;
        const { planType, quotaAmount } = session.metadata;

        const subscription = await prisma.subscription.create({
          data: {
            userId,
            type: planType,
            quotaTotal: BigInt(quotaAmount),
            startsAt: new Date(),
            expiresAt: planType === 'PERMANENT' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.transaction.create({
          data: {
            userId,
            type: 'REDEEM',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            quotaAmount: BigInt(quotaAmount),
            description: 'Stripe 支付购买套餐',
            subscriptionId: subscription.id,
            status: 'SUCCEEDED',
          },
        });

        // 触发推荐奖励
        triggerReferralReward(userId, BigInt(quotaAmount)).catch(() => {});
      }

      return reply.send({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Webhook 验证失败' } });
    }
  });

  // 支付历史
  app.get('/api/payments/history', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const transactions = await prisma.transaction.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return reply.send({ transactions: transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        quotaAmount: t.quotaAmount ? Number(t.quotaAmount) : null,
      })) });
    } catch (error) {
      console.error('Payment history error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取支付历史失败' } });
    }
  });

  // 套餐列表
  app.get('/api/payments/plans', async (_req, reply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
      return reply.send({ plans: plans.map(p => ({ ...p, price: Number(p.price), quotaAmount: Number(p.quotaAmount) })) });
    } catch (error) {
      console.error('List plans error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取套餐列表失败' } });
    }
  });
}
