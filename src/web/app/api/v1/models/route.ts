import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const channels = await prisma.modelChannel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        models: true,
        priority: true,
      },
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('List models error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '获取模型列表失败' } }, { status: 500 });
  }
}
