import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function proxy(request: NextRequest) {
  const token = request.cookies.get('dl_token')?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/victim', '/rescuer'];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

      // Enforce role-based access control on protected routes
      if (pathname.startsWith('/rescuer') && payload.role !== 'RESCUER') {
        return NextResponse.redirect(new URL('/victim', request.url));
      }
      if (pathname.startsWith('/victim') && payload.role !== 'VICTIM') {
        return NextResponse.redirect(new URL('/rescuer', request.url));
      }
    } catch {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('dl_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/victim/:path*', '/rescuer/:path*'],
};
