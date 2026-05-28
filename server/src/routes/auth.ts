import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      // 检查是否有推荐码
      let referredBy: string | null = null;
      const { ref } = req.body as any;
      if (ref) {
        const referrer = await prisma.user.findUnique({ where: { referralCode: ref.toUpperCase() } });
        if (referrer && referrer.id) {
          referredBy = referrer.id;
        }
      }

      const user = await prisma.user.create({
        data: { email, passwordHash, name, referralCode },
      });

      // 创建推荐关系
      if (referredBy) {
        await prisma.referral.create({
          data: { referrerId: referredBy, referredId: user.id },
        }).catch(() => {}); // 忽略重复错误
      }

      const token = await createSession(user.id, user.email, user.role);
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return reply.send({ user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referralCode } });
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
      return reply.send({ user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referralCode } });
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

  app.post('/api/auth/refresh', async (req, reply) => {
    try {
      const { verifySession } = await import('../lib/auth.js');
      const token = req.cookies?.[COOKIE_NAME];
      const session = await verifySession(token);
      if (!session) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });
      }
      const newToken = await createSession(session.userId as string, session.email as string, session.role as string);
      reply.setCookie(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return reply.send({ ok: true });
    } catch (error) {
      console.error('Refresh error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '刷新令牌失败' } });
    }
  });

  app.post('/api/auth/verify-email', async (req, reply) => {
    try {
      const { token } = req.body as { token?: string };
      if (!token) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '验证令牌为必填项' } });
      }
      const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
      if (!user) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '无效的验证令牌' } });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerificationToken: null },
      });
      return reply.send({ message: '邮箱验证成功' });
    } catch (error) {
      console.error('Verify email error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '邮箱验证失败' } });
    }
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
        select: { id: true, email: true, name: true, avatar: true, role: true, referralCode: true },
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

  // 忘记密码
  app.post('/api/auth/forgot-password', async (req, reply) => {
    try {
      const { email } = req.body as any;
      if (!email) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '邮箱为必填项' } });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return reply.send({ ok: true, message: '如果该邮箱已注册，重置链接已发送' });

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15分钟

      await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: token, resetPasswordExpires: expires },
      });

      const { sendPasswordResetEmail } = await import('../lib/email.js');
      await sendPasswordResetEmail(email, token);

      return reply.send({ ok: true, message: '如果该邮箱已注册，重置链接已发送' });
    } catch (error) {
      console.error('Forgot password error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '发送重置邮件失败' } });
    }
  });

  // 重置密码
  app.post('/api/auth/reset-password', async (req, reply) => {
    try {
      const { token, password } = req.body as any;
      if (!token || !password) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Token 和密码为必填项' } });
      if (password.length < 6) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '密码至少需要6个字符' } });

      const user = await prisma.user.findUnique({ where: { resetPasswordToken: token } });
      if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        return reply.status(400).send({ error: { code: 'EXPIRED', message: 'Token 已过期或无效' } });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
      });

      return reply.send({ ok: true, message: '密码已重置，请重新登录' });
    } catch (error) {
      console.error('Reset password error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '重置密码失败' } });
    }
  });
}
