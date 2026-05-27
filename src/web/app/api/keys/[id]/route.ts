import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const { id } = await params;
    const key = await prisma.apiKey.findFirst({
      where: { id, userId: session.userId as string },
    });

    if (!key) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '密钥不存在' } }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete key error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '删除密钥失败' } }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '未登录' } }, { status: 401 });
    }

    const { id } = await params;
    const { name, isActive } = await req.json();

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: session.userId as string },
    });

    if (!key) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '密钥不存在' } }, { status: 404 });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(isActive !== undefined && { isActive }) },
    });

    return NextResponse.json({ key: { id: updated.id, name: updated.name, isActive: updated.isActive } });
  } catch (error) {
    console.error('Update key error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '更新密钥失败' } }, { status: 500 });
  }
}
