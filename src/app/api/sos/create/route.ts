import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';
import { sosCreateSchema } from '@/lib/validations';
import { broadcastToRole } from '@/lib/sse';
import { evaluateTriagePriority } from '@/lib/triage';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fix #3: Rate-limit SOS submissions per authenticated user to prevent signal queue flooding
    const { allowed, retryAfterMs } = checkRateLimit(`sos:${session.userId}`);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many SOS transmissions. Retry in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = sosCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }

    const { disaster_type, injury_severity, battery_level, location_lat, location_lng, group_size, environment } = parsed.data;
    const { score, rank, explanation } = evaluateTriagePriority(
      disaster_type,
      injury_severity,
      battery_level,
      group_size,
      environment
    );

    const signal = await db.sOS_Signal.create({
      data: {
        userId: session.userId,
        disaster_type,
        injury_severity,
        battery_level,
        group_size,
        environment,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        priority_score: score,
        ai_explanation: `[MCDM Triage - Rank: ${rank} - Score: ${score}/100]\n${explanation}`,
        status: 'PENDING',
      },
    });

    broadcastToRole('signal_update', { signals: [signal] }, 'RESCUER');

    return NextResponse.json({ success: true, signalId: signal.id, rank, score });
  } catch {
    return NextResponse.json({ error: 'Failed to create SOS' }, { status: 500 });
  }
}
