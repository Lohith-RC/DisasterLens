import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';
import { dispatchSchema } from '@/lib/validations';
import { broadcastToRole } from '@/lib/sse';

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session || session.role !== 'RESCUER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = dispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }

    const { signalId, action } = parsed.data;
    const signal = await db.sOS_Signal.findUnique({ where: { id: signalId } });

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    await db.sOS_Signal.update({
      where: { id: signalId },
      data: { status: action },
    });

    const rescuer = await db.user.findUnique({ where: { id: session.userId } });

    if (action === 'DISPATCHED') {
      await db.message.create({
        data: {
          senderId: session.userId,
          senderName: rescuer?.name || 'Rescue Command',
          senderRole: 'RESCUER',
          recipientId: signal.userId,
          signalId,
          content: 'Rescue unit has been dispatched to your location. Hold on, help is en route. Keep your device powered on.',
        },
      });
      broadcastToRole('message_update', {}, 'VICTIM');
    } else if (action === 'RESOLVED') {
      await db.message.create({
        data: {
          senderId: session.userId,
          senderName: rescuer?.name || 'Rescue Command',
          senderRole: 'RESCUER',
          recipientId: signal.userId,
          signalId,
          content: 'Your SOS has been resolved. Rescue operation marked as complete. Stay safe.',
        },
      });
      broadcastToRole('message_update', {}, 'VICTIM');
    }

    broadcastToRole('signal_update', { signalId, status: action }, 'RESCUER');

    return NextResponse.json({ success: true, status: action });
  } catch {
    return NextResponse.json({ error: 'Failed to update signal' }, { status: 500 });
  }
}
