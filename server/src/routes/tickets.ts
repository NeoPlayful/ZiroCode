import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';
import { createNotification } from '../lib/notification.js';
import { calculateSlaDeadline } from '../lib/ticket-sla.js';

export async function ticketRoutes(app: FastifyInstance) {
  // 工单分类列表
  app.get('/api/tickets/categories', async (req, reply) => {
    try {
      const categories = await prisma.ticketCategory.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return reply.send({ categories });
    } catch (error) {
      console.error('List ticket categories error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取分类列表失败' } });
    }
  });

  // 工单模板列表
  app.get('/api/tickets/templates', async (req, reply) => {
    try {
      const templates = await prisma.ticketTemplate.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { createdAt: 'asc' },
      });
      return reply.send({ templates });
    } catch (error) {
      console.error('List ticket templates error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模板列表失败' } });
    }
  });

  // 工单搜索与筛选
  app.get('/api/tickets/search', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { q, categoryId, status, priority } = req.query as any;

      const where: any = { userId: user.userId };

      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ];
      }
      if (categoryId) where.categoryId = categoryId;
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const tickets = await prisma.ticket.findMany({
        where,
        include: { category: true },
        orderBy: { updatedAt: 'desc' },
      });

      return reply.send({ tickets });
    } catch (error) {
      console.error('Search tickets error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '搜索工单失败' } });
    }
  });

  // 工单导出（CSV）
  app.get('/api/tickets/export', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const tickets = await prisma.ticket.findMany({
        where: { userId: user.userId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      const csv = [
        'ID,标题,内容,状态,优先级,分类,创建时间,更新时间',
        ...tickets.map(t => [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.content.replace(/"/g, '""')}"`,
          t.status,
          t.priority,
          t.category?.name || '',
          t.createdAt.toISOString(),
          t.updatedAt.toISOString(),
        ].join(','))
      ].join('\n');

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="tickets.csv"')
        .send('﻿' + csv);
    } catch (error) {
      console.error('Export tickets error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '导出工单失败' } });
    }
  });

  // 工单列表
  app.get('/api/tickets', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const tickets = await prisma.ticket.findMany({
        where: { userId: user.userId },
        orderBy: { updatedAt: 'desc' },
      });
      return reply.send({ tickets });
    } catch (error) {
      console.error('List tickets error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取工单列表失败' } });
    }
  });

  // 创建工单
  app.post('/api/tickets', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { title, content, priority, categoryId } = req.body as any;
      if (!title || !content) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '标题和内容为必填项' } });
      }
      const ticketPriority = priority || 'NORMAL';
      const createdAt = new Date();
      const slaDeadline = calculateSlaDeadline(ticketPriority, createdAt);
      const ticket = await prisma.ticket.create({
        data: { userId: user.userId, title, content, priority: ticketPriority, categoryId, slaDeadline, createdAt },
      });
      return reply.send({ ticket });
    } catch (error) {
      console.error('Create ticket error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建工单失败' } });
    }
  });

  // 工单详情
  app.get('/api/tickets/:id', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      });
      if (!ticket || ticket.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '工单不存在' } });
      }
      return reply.send({ ticket });
    } catch (error) {
      console.error('Get ticket error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取工单详情失败' } });
    }
  });

  // 回复工单
  app.post('/api/tickets/:id/reply', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;
      const { content } = req.body as any;
      if (!content) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '回复内容不能为空' } });
      }
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '工单不存在' } });
      }
      const reply_ = await prisma.ticketReply.create({
        data: { ticketId: id, userId: user.userId, content },
      });
      await prisma.ticket.update({ where: { id }, data: { status: ticket.status === 'RESOLVED' ? 'IN_PROGRESS' : ticket.status } });

      // 如果是客服回复，通知工单所有者
      if (user.userId !== ticket.userId) {
        createNotification(ticket.userId, 'TICKET_REPLY', '工单有新回复', `您的工单「${ticket.title}」收到新回复`, `/tickets/${id}`).catch(() => {});
      }

      return reply.send({ reply: reply_ });
    } catch (error) {
      console.error('Reply ticket error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '回复失败' } });
    }
  });

  // 关闭工单
  app.put('/api/tickets/:id/close', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '工单不存在' } });
      }
      const updated = await prisma.ticket.update({
        where: { id },
        data: { status: 'CLOSED' },
      });
      return reply.send({ ticket: updated });
    } catch (error) {
      console.error('Close ticket error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '关闭工单失败' } });
    }
  });
}
