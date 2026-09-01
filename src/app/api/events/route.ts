import { handleSSEConnection } from '@/lib/sse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return handleSSEConnection();
}
