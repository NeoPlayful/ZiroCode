import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '邮箱和密码为必填项' } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '邮箱或密码错误' } },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '邮箱或密码错误' } },
        { status: 401 }
      );
    }

    const token = await createSession(user.id, user.email, user.role);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '登录失败，请稍后重试' } },
      { status: 500 }
    );
  }
}
