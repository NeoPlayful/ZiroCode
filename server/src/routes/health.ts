import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async (_req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  app.get('/api/models', async (_req, reply) => {
    try {
      const channels = await prisma.modelChannel.findMany({
        where: { isActive: true },
        select: { id: true, name: true, displayName: true, models: true, priority: true },
        orderBy: { priority: 'asc' },
      });
      return reply.send({ channels });
    } catch (error) {
      console.error('List models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型列表失败' } });
    }
  });
}
