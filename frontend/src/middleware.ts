import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SEK-001: Server-side admin route protection.
 * 
 * This is a UX-layer guard only — real security enforcement happens
 * at the backend via global JwtAuthGuard + RolesGuard.
 * 
 * This middleware prevents non-admin users from even loading admin pages,
 * reducing unnecessary API calls and providing instant redirect.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for access token in cookies or Authorization header
    const token =
      request.cookies.get('access_token')?.value ||
      request.cookies.get('refresh_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Decode JWT payload (without signature verification — this is UX only)
    // Backend enforces real authorization on every API call
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Polyfill for base64 decode in Edge Runtime (Buffer is not reliably available)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      if (!['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
