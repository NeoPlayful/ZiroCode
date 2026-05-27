import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '未登录' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '用户不存在' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '获取用户信息失败' } },
      { status: 500 }
    );
  }
}
