import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';

export async function announcementRoutes(app: FastifyInstance) {
  // 公告列表
  app.get('/api/announcements', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const announcements = await prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      });

      const readIds = await prisma.announcementRead.findMany({
        where: { userId: user.userId },
        select: { announcementId: true },
      });
      const readSet = new Set(readIds.map(r => r.announcementId));

      return reply.send({
        announcements: announcements.map(a => ({
          ...a,
          isRead: readSet.has(a.id),
        })),
      });
    } catch (error) {
      console.error('List announcements error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取公告失败' } });
    }
  });

  // 标记已读
  app.put('/api/announcements/:id/read', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const { id } = req.params as any;
      await prisma.announcementRead.upsert({
        where: { userId_announcementId: { userId: user.userId, announcementId: id } },
        update: {},
        create: { userId: user.userId, announcementId: id },
      });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Mark read error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '标记已读失败' } });
    }
  });
}
