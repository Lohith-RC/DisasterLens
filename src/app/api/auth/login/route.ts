import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, DUMMY_HASH, AUTH_COOKIE_OPTIONS } from '@/lib/auth';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rateLimit';

const GENERIC_ERROR = 'Invalid credentials';

export async function POST(req: Request) {
  try {
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ip = rawIp.split(',')[0].trim();
    const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const { name, password } = parsed.data;
    const user = await db.user.findFirst({ where: { name: { equals: name } } });

    // Always perform bcrypt check to eliminate response-time timing disparity (#19 dynamic hash)
    const targetHash = user ? user.password : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, targetHash);

    if (!user || !isValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const token = signToken(user.id, user.role);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });

    // Fix #13: cookie maxAge now comes from AUTH_COOKIE_OPTIONS (matches JWT 1d expiry)
    response.cookies.set('dl_token', token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
