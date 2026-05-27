import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '邮箱、密码和昵称为必填项' } },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '该邮箱已被注册' } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = await createSession(user.id, user.email, user.role);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '注册失败，请稍后重试' } },
      { status: 500 }
    );
  }
}
