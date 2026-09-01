import { getUserSession } from './auth';
import { SSE_PING_INTERVAL_MS, FLEET_STALE_MS } from './constants';

type EventType = 'signal_update' | 'message_update' | 'fleet_update';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  role: string;
  userId: string;
  lastSeen: number;
}

export interface FleetUnit {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

const clients = new Map<string, SSEClient>();
const encoder = new TextEncoder();
const PING_PAYLOAD = encoder.encode(': ping\n\n');

// In-memory fleet registry: ephemeral rescuer GPS positions (no DB needed)
const fleetRegistry = new Map<string, FleetUnit>();

export function updateFleetPosition(unit: FleetUnit) {
  fleetRegistry.set(unit.userId, unit);
  // Purge stale units lazily on write
  const now = Date.now();
  for (const [id, u] of fleetRegistry) {
    if (now - u.updatedAt > FLEET_STALE_MS) fleetRegistry.delete(id);
  }
}

export function getFleetPositions(): FleetUnit[] {
  const now = Date.now();
  return [...fleetRegistry.values()].filter((u) => now - u.updatedAt <= FLEET_STALE_MS);
}

let sweepInterval: ReturnType<typeof setInterval> | null = null;
function ensureSweep() {
  if (sweepInterval) return;
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
  }, SSE_PING_INTERVAL_MS);
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

/**
 * Fix #5/#16: On new client connect, deliver fleet snapshot immediately so
 * the rescuer map is populated without waiting for the next 10s beacon cycle.
 * Also emits a 'fleet_request' hint so active rescuers re-beacon promptly.
 */
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

      // Deliver current fleet snapshot to new connection
      const fleet = getFleetPositions();
      if (fleet.length > 0) {
        const payload = `data: ${JSON.stringify({ type: 'fleet_update', fleet })}\n\n`;
        try { controller.enqueue(encoder.encode(payload)); } catch {}
      }

      // Fix #5: Ask all connected rescuers to re-beacon immediately so the new
      // client gets a fresh fleet snapshot on reconnect (handles server restart gap)
      if (session.role === 'RESCUER') {
        broadcastInternal('fleet_update', { fleet_request: true }, (c) => c.role === 'RESCUER' && c.id !== clientId);
      }
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
