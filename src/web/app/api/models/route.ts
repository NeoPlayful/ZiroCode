import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const channels = await prisma.modelChannel.findMany({
    where: { isActive: true },
    select: { id: true, name: true, displayName: true, models: true, priority: true },
    orderBy: { priority: 'asc' },
  });

  return NextResponse.json({ channels });
}
