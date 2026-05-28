import type { FastifyInstance } from 'fastify';
import { verifySession, COOKIE_NAME } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { generateApiKey } from '../lib/quota.js';

export async function keyRoutes(app: FastifyInstance) {
  app.get('/api/keys', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const keys = await prisma.apiKey.findMany({
        where: { userId: session.userId as string },
        select: { id: true, name: true, key: true, isActive: true, lastUsedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        keys: keys.map(k => ({ ...k, key: k.key.slice(0, 7) + '...' + k.key.slice(-4) })),
      });
    } catch (error) {
      console.error('List keys error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取密钥列表失败' } });
    }
  });

  app.post('/api/keys', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { name, ipWhitelist, rateLimit, allowedModels, maxTokens } = req.body as any;
      if (!name) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '密钥名称为必填项' } });

      const rawKey = generateApiKey();
      const key = await prisma.apiKey.create({
        data: {
          userId: session.userId as string,
          key: rawKey,
          name,
          ...(ipWhitelist && { ipWhitelist }),
          ...(rateLimit && { rateLimit }),
          ...(allowedModels && { allowedModels }),
          ...(maxTokens && { maxTokens }),
        }
      });
      return reply.send({ key: { id: key.id, name: key.name, key: rawKey } });
    } catch (error) {
      console.error('Create key error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '创建密钥失败' } });
    }
  });

  app.delete('/api/keys/:id', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { id } = req.params as any;
      const key = await prisma.apiKey.findFirst({ where: { id, userId: session.userId as string } });
      if (!key) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '密钥不存在' } });

      await prisma.apiKey.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Delete key error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '删除密钥失败' } });
    }
  });

  app.put('/api/keys/:id', async (req, reply) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });

      const { id } = req.params as any;
      const { name, isActive } = req.body as any;

      const key = await prisma.apiKey.findFirst({ where: { id, userId: session.userId as string } });
      if (!key) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '密钥不存在' } });

      const updated = await prisma.apiKey.update({
        where: { id },
        data: { ...(name !== undefined && { name }), ...(isActive !== undefined && { isActive }) },
      });
      return reply.send({ key: { id: updated.id, name: updated.name, isActive: updated.isActive } });
    } catch (error) {
      console.error('Update key error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '更新密钥失败' } });
    }
  });
}
