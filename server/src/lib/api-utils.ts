import { prisma } from './db';
import { verifySession, COOKIE_NAME } from './auth';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser> {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  const session = await verifySession(token);
  if (!session) {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: '未登录' } });
    throw new AuthError('未登录');
  }
  return {
    userId: session.userId as string,
    email: session.email as string,
    role: session.role as string,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser> {
  const user = await requireAuth(req, reply);
  if (user.role !== 'ADMIN') {
    reply.status(403).send({ error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
    throw new AuthError('需要管理员权限', 403);
  }
  return user;
}
