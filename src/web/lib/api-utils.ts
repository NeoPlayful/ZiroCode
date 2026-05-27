import { prisma } from './db';
import { verifySession } from './auth';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await verifySession();
  if (!session) {
    throw new AuthError('未登录', 401);
  }
  return {
    userId: session.userId as string,
    email: session.email as string,
    role: session.role as string,
  };
}

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: error.message } },
      { status: error.status }
    );
  }
  throw error;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message } },
    { status: 400 }
  );
}

export function notFound(message: string = '资源不存在') {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message } },
    { status: 404 }
  );
}
