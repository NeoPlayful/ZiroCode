import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { requireAdmin, AuthError } from '../lib/api-utils.js';
import { checkChannelHealth } from '../lib/router.js';
import { isSlaViolated } from '../lib/ticket-sla.js';

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
      const query = req.query as any;
      const page = parseInt(query.page || '1');
      const pageSize = parseInt(query.pageSize || '20');
      const search = query.search || '';
      const statusFilter = query.statusFilter || 'all';

      const where: any = {};
      if (statusFilter === 'active') where.isActive = true;
      else if (statusFilter === 'inactive') where.isActive = false;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { baseUrl: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [channels, total] = await Promise.all([
        prisma.modelChannel.findMany({
          where,
          orderBy: { priority: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.modelChannel.count({ where }),
      ]);

      // Get route references for each channel
      const allRoutes = await prisma.apiRoute.findMany({
        select: { id: true, path: true, displayName: true, mode: true, primaryChannelId: true, backupChannelId: true, channelIds: true },
      });
      const channelsWithRefs = channels.map(ch => {
        const refs = allRoutes.filter(r =>
          r.primaryChannelId === ch.id ||
          r.backupChannelId === ch.id ||
          (r.channelIds || []).includes(ch.id)
        ).map(r => ({ id: r.id, path: r.path, displayName: r.displayName, mode: r.mode }));
        return { ...ch, routeRefs: refs };
      });

      return reply.send({ channels: channelsWithRefs, total, page, pageSize });
    } catch (error) {
      console.error('Admin channels error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取渠道列表失败' } });
    }
  });

  app.get('/api/admin/channels/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const channel = await prisma.modelChannel.findUnique({ where: { id } });
      if (!channel) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '渠道不存在' } });

      const routeRefs = await prisma.apiRoute.findMany({
        where: {
          OR: [
            { primaryChannelId: id },
            { backupChannelId: id },
            { channelIds: { has: id } },
          ],
        },
        select: { id: true, path: true, displayName: true, mode: true },
      });

      return reply.send({ channel: { ...channel, routeRefs } });
    } catch (error) {
      console.error('Admin get channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取渠道详情失败' } });
    }
  });

  app.post('/api/admin/channels', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { name, displayName, baseUrl, apiKey, models, priority, weight } = req.body as any;
      if (!name || !name.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '渠道名称为必填项' } });
      if (!baseUrl || !baseUrl.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Base URL 为必填项' } });
      if (!apiKey || !apiKey.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'API Key 为必填项' } });

      const existing = await prisma.modelChannel.findUnique({ where: { name: name.trim() } });
      if (existing) return reply.status(409).send({ error: { code: 'CONFLICT', message: `渠道名称 "${name}" 已被使用` } });

      const channel = await prisma.modelChannel.create({
        data: {
          name: name.trim(),
          displayName: displayName || name.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          models: models || [],
          priority: priority || 0,
          weight: weight !== undefined ? weight : 1,
        },
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

      if (data.name !== undefined) {
        if (!data.name.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '渠道名称不能为空' } });
        const existing = await prisma.modelChannel.findUnique({ where: { name: data.name.trim() } });
        if (existing && existing.id !== id) return reply.status(409).send({ error: { code: 'CONFLICT', message: `渠道名称 "${data.name}" 已被使用` } });
        updateData.name = data.name.trim();
      }
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
      if (data.apiKey !== undefined && data.apiKey !== '') updateData.apiKey = data.apiKey;
      if (data.models !== undefined) updateData.models = data.models;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.weight !== undefined) updateData.weight = data.weight;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const channel = await prisma.modelChannel.update({ where: { id }, data: updateData });
      return reply.send({ channel });
    } catch (error) {
      console.error('Admin update channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新渠道失败' } });
    }
  });

  app.delete('/api/admin/channels/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const channel = await prisma.modelChannel.findUnique({ where: { id } });
      if (!channel) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '渠道不存在' } });

      // Check route references
      const routeRefs = await prisma.apiRoute.findMany({
        where: {
          OR: [
            { primaryChannelId: id },
            { backupChannelId: id },
            { channelIds: { has: id } },
          ],
        },
        select: { id: true, path: true, displayName: true },
      });
      if (routeRefs.length > 0) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: `该渠道被 ${routeRefs.length} 个路由引用，删除后将影响这些路由` },
          routeRefs: routeRefs.map(r => ({ id: r.id, path: r.path, displayName: r.displayName })),
        });
      }

      await prisma.modelChannel.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Admin delete channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '删除渠道失败' } });
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
      const result = await checkChannelHealth(id);
      return reply.send(result);
    } catch (error) {
      console.error('Test channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '测试失败' } });
    }
  });

  // 路由管理
  app.get('/api/admin/routes', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const routes = await prisma.apiRoute.findMany({ orderBy: { path: 'asc' } });
      return reply.send({ routes });
    } catch (error) {
      console.error('Admin routes error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取路由列表失败' } });
    }
  });

  app.get('/api/admin/routes/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const route = await prisma.apiRoute.findUnique({ where: { id } });
      if (!route) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '路由不存在' } });
      return reply.send({ route });
    } catch (error) {
      console.error('Admin get route error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取路由详情失败' } });
    }
  });

  app.post('/api/admin/routes', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { path, displayName, mode } = req.body as any;
      if (!path || !path.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '路径为必填项' } });
      if (!displayName || !displayName.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '名称为必填项' } });

      const existing = await prisma.apiRoute.findUnique({ where: { path: path.trim() } });
      if (existing) return reply.status(409).send({ error: { code: 'CONFLICT', message: `路径 "${path}" 已被使用` } });

      const route = await prisma.apiRoute.create({
        data: {
          path: path.trim(),
          displayName: displayName.trim(),
          mode: mode || 'single',
          primaryChannelId: null,
          backupChannelId: null,
          channelIds: [],
          strategy: 'round_robin',
        },
      });
      return reply.send({ route });
    } catch (error) {
      console.error('Admin create route error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建路由失败' } });
    }
  });

  app.put('/api/admin/routes/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const data = req.body as any;
      const updateData: any = {};

      if (data.path !== undefined) {
        if (!data.path.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '路径不能为空' } });
        const existing = await prisma.apiRoute.findUnique({ where: { path: data.path.trim() } });
        if (existing && existing.id !== id) return reply.status(409).send({ error: { code: 'CONFLICT', message: `路径 "${data.path}" 已被使用` } });
        updateData.path = data.path.trim();
      }
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.mode !== undefined) updateData.mode = data.mode;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.primaryChannelId !== undefined) updateData.primaryChannelId = data.primaryChannelId || null;
      if (data.backupChannelId !== undefined) updateData.backupChannelId = data.backupChannelId || null;
      if (data.activeChannel !== undefined) updateData.activeChannel = data.activeChannel;
      if (data.channelIds !== undefined) updateData.channelIds = data.channelIds;
      if (data.strategy !== undefined) updateData.strategy = data.strategy;

      const route = await prisma.apiRoute.update({ where: { id }, data: updateData });
      return reply.send({ route });
    } catch (error) {
      console.error('Admin update route error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新路由失败' } });
    }
  });

  app.delete('/api/admin/routes/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      await prisma.apiRoute.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Admin delete route error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '删除路由失败' } });
    }
  });

  // 工单管理
  app.get('/api/admin/tickets', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const tickets = await prisma.ticket.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ tickets });
    } catch (error) {
      console.error('Admin list tickets error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取工单失败' } });
    }
  });

  app.get('/api/admin/tickets/sla-violations', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const tickets = await prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        include: { user: { select: { name: true, email: true } }, category: true },
        orderBy: { slaDeadline: 'asc' },
      });
      const violations = tickets.filter(t => isSlaViolated(t.slaDeadline, t.status));
      return reply.send({ tickets: violations });
    } catch (error) {
      console.error('Admin SLA violations error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取SLA违规工单失败' } });
    }
  });

  // 公告管理
  app.get('/api/admin/announcements', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
      return reply.send({ announcements });
    } catch (error) {
      console.error('Admin list announcements error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取公告失败' } });
    }
  });

  app.post('/api/admin/announcements', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { title, content } = req.body as any;
      const announcement = await prisma.announcement.create({ data: { title, content } });
      return reply.send({ announcement });
    } catch (error) {
      console.error('Create announcement error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建公告失败' } });
    }
  });

  app.put('/api/admin/announcements/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const { title, content, isActive, isPinned } = req.body as any;
      const announcement = await prisma.announcement.update({ where: { id }, data: { title, content, isActive, isPinned } });
      return reply.send({ announcement });
    } catch (error) {
      console.error('Update announcement error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新公告失败' } });
    }
  });

  app.delete('/api/admin/announcements/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      await prisma.announcement.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Delete announcement error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '删除公告失败' } });
    }
  });

  // 推荐作弊记录管理
  app.get('/api/admin/referral/fraud-logs', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const logs = await prisma.referralFraudLog.findMany({
        include: { referral: { include: { referrer: { select: { name: true, email: true } }, referred: { select: { name: true, email: true } } } } },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ logs });
    } catch (error) {
      console.error('Admin fraud logs error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取作弊记录失败' } });
    }
  });

  app.put('/api/admin/referral/fraud-logs/:id', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;
      const { id } = req.params as any;
      const { status } = req.body as any;
      const log = await prisma.referralFraudLog.update({
        where: { id },
        data: { status, reviewedBy: admin.userId, reviewedAt: new Date() },
      });
      if (status === 'CONFIRMED') {
        await prisma.referral.update({ where: { id: log.referralId }, data: { isFraud: true } });
      }
      return reply.send({ log });
    } catch (error) {
      console.error('Review fraud log error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '审查失败' } });
    }
  });
}
