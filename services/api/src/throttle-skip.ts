/**
 * Public API rate limiting must not block probes or authenticated admin traffic.
 * Login (`/api/v1/auth/login`) stays throttled.
 */
export function shouldSkipApiThrottle(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0] ?? '';
  if (path === '/health' || path === '/ready' || path === '/metrics') {
    return true;
  }
  return path === '/api/v1/admin' || path.startsWith('/api/v1/admin/');
}
