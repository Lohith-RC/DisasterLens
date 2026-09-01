import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';
import { messageSendSchema } from '@/lib/validations';
import { broadcastToRole } from '@/lib/sse';

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = messageSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }

    const { content, recipientId, signalId } = parsed.data;
    const sender = await db.user.findUnique({ where: { id: session.userId } });

    const message = await db.message.create({
      data: {
        senderId: session.userId,
        senderName: sender?.name || 'Unknown',
        senderRole: session.role,
        recipientId: recipientId || null,
        signalId: signalId || null,
        content,
      },
    });

    broadcastToRole('message_update', { messages: [message] }, 'RESCUER');
    if (recipientId) {
      broadcastToRole('message_update', { messages: [message] }, 'VICTIM');
    }

    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
