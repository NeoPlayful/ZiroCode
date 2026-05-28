import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';

export async function notificationRoutes(app: FastifyInstance) {
  // 通知列表
  app.get('/api/notifications', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { page = '1', limit = '20' } = req.query as any;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.notification.count({ where: { userId: user.userId } }),
      ]);

      return reply.send({ notifications, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      console.error('Get notifications error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取通知失败' } });
    }
  });

  // 未读数量
  app.get('/api/notifications/unread-count', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const count = await prisma.notification.count({
        where: { userId: user.userId, isRead: false },
      });
      return reply.send({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取未读数量失败' } });
    }
  });

  // 标记已读
  app.put('/api/notifications/:id/read', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;

      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification || notification.userId !== user.userId) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '通知不存在' } });
      }

      await prisma.notification.update({ where: { id }, data: { isRead: true } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Mark read error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '标记失败' } });
    }
  });

  // 全部已读
  app.put('/api/notifications/read-all', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Mark all read error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '标记失败' } });
    }
  });

  // 通知偏好
  app.put('/api/notifications/preferences', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { quotaLow, quotaExhausted, subscriptionExpiring, marketing, emailDigest } = req.body as any;

      await prisma.notificationPreference.upsert({
        where: { userId: user.userId },
        create: { userId: user.userId, quotaLow, quotaExhausted, subscriptionExpiring, marketing, emailDigest },
        update: { quotaLow, quotaExhausted, subscriptionExpiring, marketing, emailDigest },
      });

      return reply.send({ ok: true });
    } catch (error) {
      console.error('Update preferences error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新偏好失败' } });
    }
  });
}
