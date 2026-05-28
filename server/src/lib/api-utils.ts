import { prisma } from './db';
import { verifySession, COOKIE_NAME } from './auth';
import { cacheGet, cacheSet } from './cache';
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

export async function logAudit(userId: string | null, action: string, resource: string, resourceId: string | null = null, detail: any = null, ip: string | null = null) {
  await prisma.auditLog.create({
    data: { userId, action, resource, resourceId, detail, ip },
  }).catch(() => {});
}

export async function checkApiKeyRateLimit(apiKeyId: string, limit: number): Promise<boolean> {
  const key = `rate:${apiKeyId}`;
  const count = await cacheGet(key);
  if (count && parseInt(count) >= limit) return false;
  await cacheSet(key, count ? String(parseInt(count) + 1) : '1', 60);
  return true;
}

export async function validateIpWhitelist(ip: string, whitelist: string[]): Promise<boolean> {
  if (whitelist.length === 0) return true;
  return whitelist.includes(ip);
}

export async function validateModelAccess(model: string, allowedModels: string[]): Promise<boolean> {
  if (allowedModels.length === 0) return true;
  return allowedModels.includes(model);
}
