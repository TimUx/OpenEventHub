import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type Locale } from '@openeventhub/shared';
import { cookies, headers } from 'next/headers';

/** Resolve request locale: cookie → Accept-Language → `de`. */
export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const hdrs = await headers();
  return resolveLocale({
    cookieLocale: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
}

export { DEFAULT_LOCALE, LOCALE_COOKIE };
export type { Locale };
