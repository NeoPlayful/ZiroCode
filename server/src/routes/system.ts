import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/config', async (_req, reply) => {
    try {
      const configs = await prisma.systemConfig.findMany();
      const configMap: Record<string, any> = {};
      for (const config of configs) {
        configMap[config.key] = config.value;
      }
      return reply.send(configMap);
    } catch (error) {
      console.error('Get config error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取系统配置失败' } });
    }
  });

  app.get('/api/tutorials', async (_req, reply) => {
    try {
      const tutorials = [
        { id: '1', title: '快速开始指南', url: 'https://docs.zirocode.com/quick-start', category: '入门' },
        { id: '2', title: 'API 密钥使用教程', url: 'https://docs.zirocode.com/api-keys', category: '基础' },
        { id: '3', title: '订阅套餐说明', url: 'https://docs.zirocode.com/subscriptions', category: '基础' },
      ];
      return reply.send({ tutorials });
    } catch (error) {
      console.error('Get tutorials error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取教程列表失败' } });
    }
  });
}
