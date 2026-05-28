import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { requireAdmin, AuthError } from '../lib/api-utils.js';
import { checkChannelHealth } from '../lib/router.js';

async function handleAuth(req: any, reply: any) {
  try { return await requireAdmin(req, reply); }
  catch (e) { if (e instanceof AuthError) return null; throw e; }
}

export async function adminRoutes(app: FastifyInstance) {
  // 平台统计
  app.get('/api/admin/stats', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const [users, activeKeys, todayLogs, totalLogs] = await Promise.all([
        prisma.user.count(),
        prisma.apiKey.count({ where: { isActive: true } }),
        prisma.apiUsageLog.count({ where: { requestTime: { gte: new Date(Date.now() - 86400000) } } }),
        prisma.apiUsageLog.count(),
      ]);
      return reply.send({ stats: { users, activeKeys, todayCalls: todayLogs, totalCalls: totalLogs } });
    } catch (error) {
      console.error('Admin stats error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取统计失败' } });
    }
  });

  // 用户管理
  app.get('/api/admin/users', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const query = req.query as any;
      const page = parseInt(query.page || '1');
      const pageSize = 20;
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip: (page - 1) * pageSize, take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, name: true, role: true, referralCode: true, createdAt: true, _count: { select: { apiKeys: true, subscriptions: true } } },
        }),
        prisma.user.count(),
      ]);
      return reply.send({ users, total, page, pageSize });
    } catch (error) {
      console.error('Admin users error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取用户列表失败' } });
    }
  });

  app.put('/api/admin/users/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const { name, role } = req.body as any;
      const user = await prisma.user.update({ where: { id }, data: { ...(name && { name }), ...(role && { role }) } });
      return reply.send({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
      console.error('Admin update user error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新用户失败' } });
    }
  });

  // 订阅管理
  app.get('/api/admin/subscriptions', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const subs = await prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        include: { user: { select: { name: true, email: true } } },
      });
      return reply.send({ subscriptions: subs.map(s => ({ ...s, quotaTotal: Number(s.quotaTotal), quotaUsed: Number(s.quotaUsed), quotaMonthly: s.quotaMonthly ? Number(s.quotaMonthly) : null, quotaMonthlyUsed: Number(s.quotaMonthlyUsed) })) });
    } catch (error) {
      console.error('Admin subscriptions error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取订阅列表失败' } });
    }
  });

  // 兑换码管理
  app.get('/api/admin/redeem-codes', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const codes = await prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' } });
      return reply.send({ codes });
    } catch (error) {
      console.error('Admin redeem codes error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取兑换码列表失败' } });
    }
  });

  app.post('/api/admin/redeem-codes', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { quotaAmount, type, maxUses, count = 1 } = req.body as any;
      if (!quotaAmount || !type) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '配额和类型为必填项' } });

      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(await prisma.redeemCode.create({
          data: { code, quotaAmount: BigInt(quotaAmount), type, maxUses: maxUses || 1 },
        }));
      }
      return reply.send({ codes });
    } catch (error) {
      console.error('Admin create redeem code error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '生成兑换码失败' } });
    }
  });

  // 渠道管理
  app.get('/api/admin/channels', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const channels = await prisma.modelChannel.findMany({ orderBy: { priority: 'asc' } });
      return reply.send({ channels });
    } catch (error) {
      console.error('Admin channels error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取渠道列表失败' } });
    }
  });

  app.post('/api/admin/channels', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { name, displayName, baseUrl, apiKey, models, priority } = req.body as any;
      if (!name || !baseUrl || !apiKey) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '名称、地址和API Key为必填项' } });
      const channel = await prisma.modelChannel.create({
        data: { name, displayName, baseUrl, apiKey, models: models || [], priority: priority || 0 },
      });
      return reply.send({ channel });
    } catch (error) {
      console.error('Admin create channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建渠道失败' } });
    }
  });

  app.put('/api/admin/channels/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const data = req.body as any;
      const updateData: any = {};
      if (data.displayName) updateData.displayName = data.displayName;
      if (data.baseUrl) updateData.baseUrl = data.baseUrl;
      if (data.apiKey) updateData.apiKey = data.apiKey;
      if (data.models) updateData.models = data.models;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      const channel = await prisma.modelChannel.update({ where: { id }, data: updateData });
      return reply.send({ channel });
    } catch (error) {
      console.error('Admin update channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新渠道失败' } });
    }
  });

  // 提现管理
  app.get('/api/admin/withdrawals', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const withdrawals = await prisma.withdrawalRequest.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        include: { user: { select: { name: true, email: true } } },
      });
      return reply.send({ withdrawals });
    } catch (error) {
      console.error('Admin withdrawals error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取提现列表失败' } });
    }
  });

  app.put('/api/admin/withdrawals/:id/approve', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const w = await prisma.withdrawalRequest.update({ where: { id }, data: { status: 'APPROVED', processedAt: new Date() } });
      return reply.send({ withdrawal: w });
    } catch (error) {
      console.error('Admin approve withdrawal error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '审批失败' } });
    }
  });

  app.put('/api/admin/withdrawals/:id/reject', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const { remark } = req.body as any;
      const w = await prisma.withdrawalRequest.update({ where: { id }, data: { status: 'REJECTED', processedAt: new Date(), remark } });
      return reply.send({ withdrawal: w });
    } catch (error) {
      console.error('Admin reject withdrawal error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '审批失败' } });
    }
  });

  app.get('/api/admin/audit-logs', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const query = req.query as any;
      const page = parseInt(query.page || '1');
      const pageSize = 50;
      const where: any = {};
      if (query.userId) where.userId = query.userId;
      if (query.action) where.action = query.action;
      if (query.resource) where.resource = query.resource;
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.auditLog.count({ where }),
      ]);
      return reply.send({ logs, total, page, pageSize });
    } catch (error) {
      console.error('Admin audit logs error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取审计日志失败' } });
    }
  });

  app.post('/api/admin/batch/redeem-codes', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { count, quotaAmount, type } = req.body as any;
      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(8).toString('hex').toUpperCase();
        codes.push({ code, quotaAmount: BigInt(quotaAmount), type });
      }
      await prisma.redeemCode.createMany({ data: codes });
      return reply.send({ codes: codes.map(c => c.code) });
    } catch (error) {
      console.error('Batch create redeem codes error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '批量生成失败' } });
    }
  });

  app.post('/api/admin/batch/adjust-quota', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { userIds, quotaAmount } = req.body as any;
      for (const userId of userIds) {
        const sub = await prisma.subscription.findFirst({ where: { userId, type: 'PAY_AS_YOU_GO' } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { quotaTotal: { increment: BigInt(quotaAmount) } } });
        }
      }
      return reply.send({ success: true });
    } catch (error) {
      console.error('Batch adjust quota error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '批量调整失败' } });
    }
  });

  app.post('/api/admin/channels/:id/test', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const healthy = await checkChannelHealth(id);
      return reply.send({ healthy });
    } catch (error) {
      console.error('Test channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '测试失败' } });
    }
  });
}
