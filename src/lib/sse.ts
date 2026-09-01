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
const encoder = new TextEncoder();
const PING_PAYLOAD = encoder.encode(': ping\n\n');

let sweepInterval: ReturnType<typeof setInterval> | null = null;
function ensureSweep() {
  if (sweepInterval) return;
  // Sweep every 25s: send keepalive ping and purge dead sockets
  sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, c] of clients) {
      try {
        c.controller.enqueue(PING_PAYLOAD);
        c.lastSeen = now;
      } catch {
        try { c.controller.close(); } catch {}
        clients.delete(id);
      }
    }
  }, 25_000);
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

/**
 * Unified pre-encoded broadcaster.
 * Encodes payload once before iterating over matching client sockets.
 */
function broadcastInternal(type: EventType, data: unknown, filter?: (c: SSEClient) => boolean) {
  const payload = `data: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
  const encoded = encoder.encode(payload);

  for (const [id, client] of clients) {
    if (!filter || filter(client)) {
      try {
        client.controller.enqueue(encoded);
        touch(id);
      } catch {
        clients.delete(id);
      }
    }
  }
}

export async function broadcast(type: EventType, data: unknown) {
  broadcastInternal(type, data);
}

export async function broadcastToRole(type: EventType, data: unknown, role: string) {
  broadcastInternal(type, data, (c) => c.role === role);
}

export async function broadcastToUser(type: EventType, data: unknown, userId: string) {
  broadcastInternal(type, data, (c) => c.userId === userId);
}

export function createSSEStream(controller: ReadableStreamDefaultController) {
  controller.enqueue(encoder.encode('retry: 3000\n\n'));
}

export async function handleSSEConnection() {
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
