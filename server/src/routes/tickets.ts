import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';

export async function ticketRoutes(app: FastifyInstance) {
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
      const { title, content, priority } = req.body as any;
      if (!title || !content) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '标题和内容为必填项' } });
      }
      const ticket = await prisma.ticket.create({
        data: { userId: user.userId, title, content, priority: priority || 'NORMAL' },
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
      return reply.send({ reply: reply_ });
    } catch (error) {
      console.error('Reply ticket error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '回复失败' } });
    }
  });
}
