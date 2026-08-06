import type { NextRequest } from 'next/server';

import { getServerApiBase } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Portal-facing calendar subscription feed (proxies API iCalendar). */
export async function GET(request: NextRequest): Promise<Response> {
  const upstream = new URL(`${getServerApiBase()}/api/v1/calendar.ics`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  const response = await fetch(upstream, {
    headers: { Accept: 'text/calendar, text/plain, */*' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return new Response('Calendar feed unavailable', { status: 502 });
  }

  const body = await response.text();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="openeventhub.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
