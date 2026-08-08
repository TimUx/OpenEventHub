/**
 * Admin white-label branding (build-time / Next public env).
 * Logo: replace `public/brand/mark.*` or set NEXT_PUBLIC_ADMIN_LOGO_URL.
 * Title: set NEXT_PUBLIC_ADMIN_TITLE (e.g. "FestSchmiede Admin").
 */

const DEFAULT_TITLE = 'OpenEventHub Admin';

export function getAdminTitle(fallback = DEFAULT_TITLE): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_TITLE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : fallback;
}

/** When set, header/login use this image URL instead of the inline BrandMark SVG. */
export function getAdminLogoUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_LOGO_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}
