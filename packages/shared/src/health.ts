/**
 * Canonical health probe contracts for every OpenEventHub service.
 * See docs/HEALTHCHECKS.md.
 */

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly service: string;
  readonly version: string;
  readonly timestamp: string;
}

export interface ReadinessCheckResult extends HealthCheckResult {
  readonly checks: Readonly<Record<string, HealthStatus>>;
}

export function createHealthResult(
  service: string,
  version: string,
  status: HealthStatus = 'ok',
): HealthCheckResult {
  return {
    status,
    service,
    version,
    timestamp: new Date().toISOString(),
  };
}

export function createReadinessResult(
  service: string,
  version: string,
  checks: Readonly<Record<string, HealthStatus>>,
): ReadinessCheckResult {
  const values = Object.values(checks);
  const status: HealthStatus = values.every((value) => value === 'ok')
    ? 'ok'
    : values.some((value) => value === 'error')
      ? 'error'
      : 'degraded';

  return {
    ...createHealthResult(service, version, status),
    checks,
  };
}
