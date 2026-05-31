import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { requireAdmin, AuthError } from '../lib/api-utils.js';
import { checkChannelHealth } from '../lib/router.js';
import { isSlaViolated } from '../lib/ticket-sla.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

async function handleAuth(req: any, reply: any) {
  try { return await requireAdmin(req, reply); }
  catch (e) { if (e instanceof AuthError) return null; throw e; }
}

async function getRedeemCodePrefix(): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'redeem_code_prefix' } });
  return config?.value ? String(config.value) : '';
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
      const query = req.query as any;
      const page = parseInt(query.page || '1');
      const pageSize = parseInt(query.pageSize || '20');
      const search = query.search || '';
      const typeFilter = query.typeFilter || 'all';
      const statusFilter = query.statusFilter || 'all';

      const where: any = {};
      if (typeFilter !== 'all') where.type = typeFilter;
      if (statusFilter === 'active') where.isActive = true;
      else if (statusFilter === 'expired') where.isActive = false;
      if (search) where.user = { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] };

      const [subs, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { user: { select: { name: true, email: true } } },
        }),
        prisma.subscription.count({ where }),
      ]);
      return reply.send({ subscriptions: subs.map(s => ({ ...s, quotaTotal: Number(s.quotaTotal), quotaUsed: Number(s.quotaUsed), quotaMonthly: s.quotaMonthly ? Number(s.quotaMonthly) : null, quotaMonthlyUsed: Number(s.quotaMonthlyUsed) })), total, page, pageSize });
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
      const query = req.query as any;
      const page = parseInt(query.page || '1');
      const pageSize = parseInt(query.pageSize || '20');
      const search = query.search || '';
      const typeFilter = query.typeFilter || 'all';
      const statusFilter = query.statusFilter || 'all';

      const where: any = {};
      if (search) where.code = { contains: search, mode: 'insensitive' };
      if (typeFilter !== 'all') where.type = typeFilter;
      if (statusFilter === 'active') where.isActive = true;
      else if (statusFilter === 'disabled') where.isActive = false;

      const [codes, total] = await Promise.all([
        prisma.redeemCode.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.redeemCode.count({ where }),
      ]);

      const [totalCount, usedCount, todayCount] = await Promise.all([
        prisma.redeemCode.count(),
        prisma.redeemCode.count({ where: { usedCount: { gte: 1 } } }),
        prisma.redeemCode.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      ]);

      return reply.send({ codes, total, page, pageSize, totalCount, usedCount, unusedCount: totalCount - usedCount, todayGenerated: todayCount });
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
        const prefix = await getRedeemCodePrefix();
        const code = prefix + crypto.randomBytes(4).toString('hex').toUpperCase();
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
      const { name, displayName, baseUrl, apiKey, models, priority, weight, timeout, modelRedirect, proxyUrl } = req.body as any;
      if (!name || !name.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '渠道名称为必填项' } });
      if (!baseUrl || !baseUrl.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Base URL 为必填项' } });

      const existing = await prisma.modelChannel.findUnique({ where: { name: name.trim() } });
      if (existing) return reply.status(409).send({ error: { code: 'CONFLICT', message: `渠道名称 "${name}" 已被使用` } });

      const maxOrder = await prisma.modelChannel.aggregate({ _max: { displayOrder: true } });
      const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

      const channel = await prisma.modelChannel.create({
        data: {
          name: name.trim(),
          displayName: displayName || name.trim(),
          displayOrder: nextOrder,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey?.trim() || '',
          models: models || [],
          priority: priority || 0,
          weight: weight !== undefined ? weight : 1,
          timeout: timeout !== undefined && timeout !== '' ? parseInt(timeout) : 0,
          modelRedirect: modelRedirect || undefined,
          proxyUrl: proxyUrl || '',
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
      if (data.timeout !== undefined) updateData.timeout = data.timeout !== '' ? parseInt(data.timeout) : 0;
      if (data.modelRedirect !== undefined) updateData.modelRedirect = data.modelRedirect;
      if (data.proxyUrl !== undefined) updateData.proxyUrl = data.proxyUrl;

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
        const prefix = await getRedeemCodePrefix();
        const code = prefix + crypto.randomBytes(8).toString('hex').toUpperCase();
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
      const data = req.body as any;
      if (!data.path || !data.path.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '路径为必填项' } });
      if (!data.displayName || !data.displayName.trim()) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '名称为必填项' } });

      const existing = await prisma.apiRoute.findUnique({ where: { path: data.path.trim() } });
      if (existing) return reply.status(409).send({ error: { code: 'CONFLICT', message: `路径 "${data.path}" 已被使用` } });

      const route = await prisma.apiRoute.create({
        data: {
          path: data.path.trim(),
          displayName: data.displayName.trim(),
          mode: data.mode || 'single',
          primaryChannelId: data.primaryChannelId || null,
          backupChannelId: data.backupChannelId || null,
          channelIds: data.channelIds || [],
          strategy: data.strategy || 'round_robin',
          status: data.status || 'active',
          activeChannel: data.activeChannel || 'primary',
          billingMultiplier: data.billingMultiplier ?? 1.0,
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
      if (data.billingMultiplier !== undefined) updateData.billingMultiplier = data.billingMultiplier;

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

  // ==================== Analytics Endpoints ====================

  // 今日概览
  app.get('/api/admin/analytics/overview', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const cached = await cacheGet('admin:analytics:overview');
      if (cached) return reply.send(JSON.parse(cached));

      const [todayLogs, yesterdayLogs, activeUsers, totalTokensAgg, errorLogs] = await Promise.all([
        prisma.apiUsageLog.findMany({ where: { requestTime: { gte: todayStart } }, select: { id: true, tokensUsed: true, quotaUsed: true, statusCode: true } }),
        prisma.apiUsageLog.findMany({ where: { requestTime: { gte: yesterdayStart, lt: todayStart } }, select: { id: true } }),
        prisma.apiUsageLog.groupBy({ by: ['userId'], where: { requestTime: { gte: todayStart } }, _count: { userId: true } }),
        prisma.apiUsageLog.aggregate({ where: { requestTime: { gte: todayStart } }, _sum: { tokensUsed: true } }),
        prisma.apiUsageLog.count({ where: { requestTime: { gte: todayStart }, statusCode: { gte: 500 } } }),
      ]);

      const result = {
        todayRequests: todayLogs.length,
        todayTokens: totalTokensAgg._sum.tokensUsed || 0,
        todayActiveUsers: activeUsers.length,
        todayErrorRate: todayLogs.length > 0 ? Math.round((errorLogs / todayLogs.length) * 10000) / 100 : 0,
        yesterdayRequests: yesterdayLogs.length,
        yesterdayTokens: 0,
      };

      await cacheSet('admin:analytics:overview', JSON.stringify(result), 30);
      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics overview error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取概览失败' } });
    }
  });

  // 趋势图数据
  app.get('/api/admin/analytics/trends', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { period = '7d', granularity = 'day', metric = 'requests' } = req.query as any;
      const now = new Date();
      let from: Date;

      switch (period) {
        case '24h': from = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '30d': from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        default: from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      }

      let points: { time: string; value: number }[];

      if (granularity === 'hour') {
        const rawLogs = await prisma.apiUsageLog.findMany({
          where: { requestTime: { gte: from } },
          select: { tokensUsed: true, requestTime: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true, cost: true },
          orderBy: { requestTime: 'asc' },
        });
        // 生成24小时完整时段
        const now = new Date();
        const base = new Date(now);
        base.setMinutes(0, 0, 0);
        base.setHours(base.getHours() - 23);
        points = [];
        for (let i = 0; i < 24; i++) {
          const h = new Date(base.getTime() + i * 3600000);
          points.push({ time: h.toISOString(), value: 0 });
        }
        for (const log of rawLogs) {
          const d = new Date(log.requestTime);
          const idx = Math.floor((d.getTime() - base.getTime()) / 3600000);
          if (idx >= 0 && idx < 24) {
            if (metric === 'tokens') points[idx].value += log.tokensUsed;
            else if (metric === 'input_tokens') points[idx].value += log.inputTokens;
            else if (metric === 'output_tokens') points[idx].value += log.outputTokens;
            else if (metric === 'cache_read_tokens') points[idx].value += log.cacheReadTokens;
            else if (metric === 'cost') points[idx].value += Number(log.cost || 0);
            else points[idx].value += 1;
          }
        }
      } else {
        // 生成完整时间段（7天或30天），按日填充
        const numDays = period === '30d' ? 30 : 7;
        const rawLogs = await prisma.apiUsageLog.findMany({
          where: { requestTime: { gte: from } },
          select: { tokensUsed: true, requestTime: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true, cost: true },
          orderBy: { requestTime: 'asc' },
        });
        // 从当前日期往前倒推 N 天
        points = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = numDays - 1; i >= 0; i--) {
          const d = new Date(today.getTime() - i * 86400000);
          points.push({ time: d.toISOString(), value: 0 });
        }
        for (const log of rawLogs) {
          const logDate = new Date(log.requestTime);
          logDate.setHours(0, 0, 0, 0);
          const idx = Math.floor((logDate.getTime() - new Date(points[0].time).getTime()) / 86400000);
          if (idx >= 0 && idx < numDays) {
            if (metric === 'tokens') points[idx].value += log.tokensUsed;
            else if (metric === 'input_tokens') points[idx].value += log.inputTokens;
            else if (metric === 'output_tokens') points[idx].value += log.outputTokens;
            else if (metric === 'cache_read_tokens') points[idx].value += log.cacheReadTokens;
            else if (metric === 'cost') points[idx].value += Number(log.cost || 0);
            else points[idx].value += 1;
          }
        }
      }

      return reply.send({ points });
    } catch (error) {
      console.error('Admin analytics trends error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取趋势失败' } });
    }
  });

  // 模型排名
  app.get('/api/admin/analytics/models', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { from, to, orderBy = 'tokens', limit = 10 } = req.query as any;
      const filter: any = {};
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };

      const cached = await cacheGet(`admin:analytics:models:${from || ''}:${to || ''}`);
      if (cached) return reply.send(JSON.parse(cached));

      const groups = await prisma.apiUsageLog.groupBy({
        by: ['model'],
        where: filter,
        _count: { id: true },
        _sum: { tokensUsed: true, quotaUsed: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true, cost: true },
        orderBy: orderBy === 'requests' ? { _count: { id: 'desc' } } : { _sum: { tokensUsed: 'desc' } },
        take: parseInt(String(limit)) || 10,
      });

      const result = {
        models: groups.map(g => ({
          model: g.model,
          requests: g._count.id,
          tokens: g._sum.tokensUsed || 0,
          inputTokens: g._sum.inputTokens || 0,
          outputTokens: g._sum.outputTokens || 0,
          cacheReadTokens: g._sum.cacheReadTokens || 0,
          cacheWriteTokens: g._sum.cacheCreationTokens || 0,
          cost: Number(g._sum.cost || 0),
          quota: Number(g._sum.quotaUsed || BigInt(0)),
        })),
      };

      await cacheSet(`admin:analytics:models:${from || ''}:${to || ''}`, JSON.stringify(result), 60);
      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型排名失败' } });
    }
  });

  // 渠道报表
  app.get('/api/admin/analytics/channels', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { from, to } = req.query as any;
      const filter: any = {};
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };

      const channels = await prisma.modelChannel.findMany({ select: { id: true, name: true, displayName: true, healthStatus: true } });
      const channelMap = new Map(channels.map(c => [c.id, c]));

      const groups = await prisma.apiUsageLog.groupBy({
        by: ['channelId'],
        where: { ...filter, channelId: { not: null } },
        _count: { channelId: true },
        _sum: { tokensUsed: true },
      });

      const result = {
        channels: groups.map(g => ({
          channelId: g.channelId,
          channelName: channelMap.get(g.channelId || '')?.displayName || channelMap.get(g.channelId || '')?.name || g.channelId,
          healthStatus: channelMap.get(g.channelId || '')?.healthStatus || 'UNKNOWN',
          requests: g._count.channelId,
          tokens: g._sum.tokensUsed || 0,
        })),
      };

      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics channels error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取渠道报表失败' } });
    }
  });

  // Top 用户
  app.get('/api/admin/analytics/top-users', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { from, to, limit = 10 } = req.query as any;
      const filter: any = {};
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };

      const groups = await prisma.apiUsageLog.groupBy({
        by: ['userId'],
        where: filter,
        _count: { id: true },
        _sum: { tokensUsed: true, quotaUsed: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true, cost: true },
        orderBy: { _sum: { quotaUsed: 'desc' } },
        take: parseInt(String(limit)) || 10,
      });

      const userIds = groups.map(g => g.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      const result = {
        users: groups.map(g => ({
          userId: g.userId,
          name: userMap.get(g.userId)?.name || 'Unknown',
          email: userMap.get(g.userId)?.email || '',
          requests: g._count.id,
          tokens: g._sum.tokensUsed || 0,
          inputTokens: g._sum.inputTokens || 0,
          outputTokens: g._sum.outputTokens || 0,
          cacheReadTokens: g._sum.cacheReadTokens || 0,
          cacheWriteTokens: g._sum.cacheCreationTokens || 0,
          cost: Number(g._sum.cost || 0),
          quota: Number(g._sum.quotaUsed || BigInt(0)),
        })),
      };

      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics top-users error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取用户排行失败' } });
    }
  });

  // 错误分布
  app.get('/api/admin/analytics/errors', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { from, to } = req.query as any;
      const filter: any = { statusCode: { gte: 400 } };
      if (from) filter.requestTime = { ...filter.requestTime, gte: new Date(from + 'T00:00:00.000') };
      if (to) filter.requestTime = { ...filter.requestTime, lt: new Date(to + 'T23:59:59.999') };

      const groups = await prisma.apiUsageLog.groupBy({
        by: ['statusCode', 'error'],
        where: filter,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });

      const result = {
        errors: groups.map(g => ({
          statusCode: g.statusCode,
          error: g.error ? (g.error.length > 100 ? g.error.slice(0, 100) + '...' : g.error) : `HTTP ${g.statusCode}`,
          count: g._count.id,
        })),
      };

      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics errors error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取错误分布失败' } });
    }
  });

  // 请求日志明细
  app.get('/api/admin/analytics/requests', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const { page = '1', pageSize = '20', userId, model, channelId, statusCode, from, to } = req.query as any;
      const p = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

      const where: any = {};
      if (userId) where.userId = userId;
      if (model) where.model = model;
      if (channelId) where.channelId = channelId;
      if (statusCode) where.statusCode = parseInt(statusCode);
      if (from || to) {
        where.requestTime = {};
        if (from) where.requestTime.gte = new Date(from);
        if (to) where.requestTime.lte = new Date(to);
      }

      const [total, logs] = await Promise.all([
        prisma.apiUsageLog.count({ where }),
        prisma.apiUsageLog.findMany({
          where,
          orderBy: { requestTime: 'desc' },
          skip: (p - 1) * ps,
          take: ps,
          include: { user: { select: { name: true, email: true } } },
        }),
      ]);

      // Map channelIds to displayOrder/displayName
      const channelIds = [...new Set(logs.map(l => l.channelId).filter(Boolean))] as string[];
      const channels = channelIds.length > 0
        ? await prisma.modelChannel.findMany({
            where: { id: { in: channelIds } },
            select: { id: true, displayOrder: true, displayName: true },
          })
        : [];
      const channelMap = new Map(channels.map(c => [c.id, { displayOrder: c.displayOrder, displayName: c.displayName }]));

      const result = {
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps),
        logs: logs.map(l => {
          const chInfo = l.channelId ? channelMap.get(l.channelId) : null;
          return {
            id: l.id,
            userId: l.userId,
            userName: (l as any).user?.name || null,
            userEmail: (l as any).user?.email || null,
            model: l.model,
            channelId: l.channelId,
            channelDisplayOrder: chInfo?.displayOrder ?? null,
            channelDisplayName: chInfo?.displayName ?? null,
            tokensUsed: l.tokensUsed,
            quotaUsed: Number(l.quotaUsed),
            latencyMs: l.latencyMs,
            clientIp: l.clientIp,
            routePath: l.routePath,
            requestPath: (l as any).requestPath || null,
            statusCode: l.statusCode,
            error: l.error,
            requestTime: l.requestTime,
            responseTime: l.responseTime,
          };
        }),
      };

      return reply.send(result);
    } catch (error) {
      console.error('Admin analytics requests error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取请求日志失败' } });
    }
  });

  // 系统配置读写
  app.get('/api/admin/config', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const configs = await prisma.systemConfig.findMany();
      const configMap: Record<string, any> = {};
      for (const config of configs) {
        configMap[config.key] = config.value;
      }
      return reply.send(configMap);
    } catch (error) {
      console.error('Admin get config error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取系统配置失败' } });
    }
  });

  app.put('/api/admin/config', async (req, reply) => {
    try {
      const admin = await handleAuth(req, reply);
      if (!admin) return;

      const body = req.body as Record<string, any>;
      for (const [key, value] of Object.entries(body)) {
        await prisma.systemConfig.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Admin update config error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新系统配置失败' } });
    }
  });
}
