import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { getAvailableChannels } from '../lib/router.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

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

  app.get('/api/models/:channel', async (req, reply) => {
    try {
      const { channel } = req.params as any;
      const channelData = await prisma.modelChannel.findFirst({
        where: { name: channel, isActive: true },
        select: { id: true, name: true, displayName: true, models: true, priority: true, baseUrl: true },
      });
      if (!channelData) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '渠道不存在' } });
      }
      return reply.send({ channel: channelData, tutorial: `使用 ${channelData.displayName || channelData.name} 渠道的模型` });
    } catch (error) {
      console.error('Get channel error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取渠道详情失败' } });
    }
  });

  // OpenAI 兼容模型列表
  app.get('/api/v1/models', async (_req, reply) => {
    try {
      const cached = await cacheGet('models:list');
      if (cached) return reply.send(JSON.parse(cached));

      const channels = await getAvailableChannels();
      const models = channels.flatMap(c => c.models.map(m => ({
        id: m, object: 'model', created: Math.floor(c.createdAt.getTime() / 1000), owned_by: c.name,
      })));
      const result = { object: 'list', data: models };
      await cacheSet('models:list', JSON.stringify(result), 300);
      return reply.send(result);
    } catch (error) {
      console.error('List models error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取模型列表失败' } });
    }
  });
}
