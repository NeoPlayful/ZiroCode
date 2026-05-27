import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { createSession, COOKIE_NAME } from '../lib/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, reply) => {
    try {
      const { email, password, name } = req.body as any;
      if (!email || !password || !name) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '邮箱、密码和昵称为必填项' } });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: { code: 'CONFLICT', message: '该邮箱已被注册' } });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, passwordHash, name } });
      const token = await createSession(user.id, user.email, user.role);
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return reply.send({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
      console.error('Register error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '注册失败，请稍后重试' } });
    }
  });

  app.post('/api/auth/login', async (req, reply) => {
    try {
      const { email, password } = req.body as any;
      if (!email || !password) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '邮箱和密码为必填项' } });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '邮箱或密码错误' } });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '邮箱或密码错误' } });
      }
      const token = await createSession(user.id, user.email, user.role);
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return reply.send({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '登录失败，请稍后重试' } });
    }
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.setCookie(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', async (req, reply) => {
    try {
      const { verifySession } = await import('../lib/auth.js');
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });
      }
      const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });
      if (!user) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
      }
      return reply.send({ user });
    } catch (error) {
      console.error('Get user error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取用户信息失败' } });
    }
  });
}
