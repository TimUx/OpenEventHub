import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  resolveLocale,
  type Locale,
} from '@openeventhub/shared';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;

  if (isLocale(existing)) {
    return response;
  }

  const locale: Locale = resolveLocale({
    acceptLanguage: request.headers.get('accept-language'),
  });

  response.cookies.set(LOCALE_COOKIE, locale || DEFAULT_LOCALE, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|health|ready|metrics).*)'],
};
