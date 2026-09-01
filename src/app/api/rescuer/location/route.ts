import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth';
import { updateFleetPosition, broadcastToRole } from '@/lib/sse';
import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session || session.role !== 'RESCUER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const unit = {
      userId: session.userId,
      name: parsed.data.name,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      updatedAt: Date.now(),
    };

    updateFleetPosition(unit);
    broadcastToRole('fleet_update', { fleet: [unit] }, 'RESCUER');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
