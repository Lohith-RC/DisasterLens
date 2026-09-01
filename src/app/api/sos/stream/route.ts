import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getUserSession();
    if (!session || session.role !== 'RESCUER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const signals = await db.sOS_Signal.findMany({
      where: { status: { not: 'RESOLVED' } },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { priority_score: 'desc' },
    });

    return NextResponse.json({ signals });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}
