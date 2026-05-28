import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';
import { dispatchWebhook } from '../lib/webhook-dispatcher.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Webhook 列表
  app.get('/api/webhooks', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const webhooks = await prisma.webhookEndpoint.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ webhooks });
    } catch (error) {
      console.error('List webhooks error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取 Webhook 列表失败' } });
    }
  });

  // 创建 Webhook
  app.post('/api/webhooks', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { name, url, events } = req.body as any;
      if (!name || !url || !events || !Array.isArray(events)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '名称、URL 和事件为必填项' } });
      }
      const secret = crypto.randomBytes(32).toString('hex');
      const webhook = await prisma.webhookEndpoint.create({
        data: { userId: user.userId, name, url, secret, events },
      });
      return reply.send({ webhook });
    } catch (error) {
      console.error('Create webhook error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建 Webhook 失败' } });
    }
  });

  // 更新 Webhook
  app.put('/api/webhooks/:id', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;
      const { name, url, events, isActive } = req.body as any;

      const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!existing || existing.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Webhook 不存在' } });
      }

      const webhook = await prisma.webhookEndpoint.update({
        where: { id },
        data: { ...(name && { name }), ...(url && { url }), ...(events && { events }), ...(isActive !== undefined && { isActive }) },
      });
      return reply.send({ webhook });
    } catch (error) {
      console.error('Update webhook error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新 Webhook 失败' } });
    }
  });

  // 删除 Webhook
  app.delete('/api/webhooks/:id', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;

      const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!existing || existing.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Webhook 不存在' } });
      }

      await prisma.webhookEndpoint.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Delete webhook error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '删除 Webhook 失败' } });
    }
  });

  // 测试 Webhook
  app.post('/api/webhooks/:id/test', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;

      const webhook = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!webhook || webhook.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Webhook 不存在' } });
      }

      dispatchWebhook(user.userId, 'QUOTA_LOW', { test: true, message: '这是一条测试消息' }).catch(() => {});
      return reply.send({ ok: true, message: '测试请求已发送' });
    } catch (error) {
      console.error('Test webhook error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '测试失败' } });
    }
  });

  // Webhook 日志
  app.get('/api/webhooks/:id/logs', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;

      const webhook = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!webhook || webhook.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Webhook 不存在' } });
      }

      const logs = await prisma.webhookLog.findMany({
        where: { endpointId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return reply.send({ logs });
    } catch (error) {
      console.error('Get webhook logs error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取日志失败' } });
    }
  });
}
