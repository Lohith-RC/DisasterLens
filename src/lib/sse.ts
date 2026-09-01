import { getUserSession } from './auth';

type EventType = 'signal_update' | 'message_update';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  role: string;
  userId: string;
  lastSeen: number;
}

const clients = new Map<string, SSEClient>();
const STALE_MS = 60_000;

let sweepInterval: ReturnType<typeof setInterval> | null = null;
function ensureSweep() {
  if (sweepInterval) return;
  sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, c] of clients) {
      if (now - c.lastSeen > STALE_MS) {
        try { c.controller.close(); } catch {}
        clients.delete(id);
      }
    }
  }, 30_000);
}

export function addClient(id: string, client: Omit<SSEClient, 'lastSeen'>) {
  clients.set(id, { ...client, lastSeen: Date.now() });
}

export function removeClient(id: string) {
  clients.delete(id);
}

function touch(id: string) {
  const c = clients.get(id);
  if (c) c.lastSeen = Date.now();
}

export async function broadcast(type: EventType, data: unknown) {
  const payload = `data: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
  const encoder = new TextEncoder();
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(encoder.encode(payload));
      touch(id);
    } catch {
      clients.delete(id);
    }
  }
}

export async function broadcastToRole(type: EventType, data: unknown, role: string) {
  const payload = `data: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
  const encoder = new TextEncoder();
  for (const [id, client] of clients) {
    if (client.role === role) {
      try {
        client.controller.enqueue(encoder.encode(payload));
        touch(id);
      } catch {
        clients.delete(id);
      }
    }
  }
}

export function createSSEStream(controller: ReadableStreamDefaultController) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode('retry: 3000\n\n'));
}

export async function handleSSEConnection(req: Request) {
  const session = await getUserSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  ensureSweep();

  const clientId = `client_${Date.now()}_${crypto.randomUUID().slice(0, 12)}`;

  const stream = new ReadableStream({
    start(controller) {
      createSSEStream(controller);
      addClient(clientId, { id: clientId, controller, role: session.role, userId: session.userId });
    },
    cancel() {
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
