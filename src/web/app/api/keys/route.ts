import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/quota';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.userId as string },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const maskedKeys = keys.map((k) => ({
      ...k,
      key: k.key.slice(0, 7) + '...' + k.key.slice(-4),
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('List keys error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取密钥列表失败' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '密钥名称为必填项' } }, { status: 400 });
    }

    const rawKey = generateApiKey();
    const key = await prisma.apiKey.create({
      data: {
        userId: session.userId as string,
        key: rawKey,
        name,
      },
    });

    return NextResponse.json({ key: { id: key.id, name: key.name, key: rawKey } });
  } catch (error) {
    console.error('Create key error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '创建密钥失败' } }, { status: 500 });
  }
}
