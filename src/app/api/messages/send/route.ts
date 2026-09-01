import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';
import { messageSendSchema } from '@/lib/validations';
import { broadcastToRole, broadcastToUser } from '@/lib/sse';

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

    // Broadcast to Rescuer Mission Terminal
    broadcastToRole('message_update', { messages: [message] }, 'RESCUER');

    // Secure targeted dispatch: only deliver private victim message to the intended recipient
    if (recipientId) {
      broadcastToUser('message_update', { messages: [message] }, recipientId);
    }

    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
