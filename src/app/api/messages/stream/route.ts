import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Fix #12: Filter messages by role intent.
 * - Messages sent to a specific recipientId are private (sender ↔ recipient only)
 * - Broadcast messages (recipientId: null) from RESCUER are system-wide announcements
 *   visible to all; victim-to-victim messages with no recipient are also included
 * - Rescuers see all messages (they are the command terminal)
 */
export async function GET() {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isRescuer = session.role === 'RESCUER';

    const messages = await db.message.findMany({
      where: isRescuer
        ? // Rescuers see everything
          {}
        : {
            OR: [
              // Messages I sent
              { senderId: session.userId },
              // Messages sent directly to me
              { recipientId: session.userId },
              // Rescuer broadcast announcements (no specific recipient = system-wide)
              { recipientId: null, senderRole: 'RESCUER' },
            ],
          },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
