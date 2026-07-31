import type { HealthStatus } from '@openeventhub/shared';

export const SERVICE_RUNTIME_OPTIONS = Symbol('SERVICE_RUNTIME_OPTIONS');

export type ReadinessChecksFn = () => Promise<Readonly<Record<string, HealthStatus>>>;

export interface ServiceRuntimeModuleOptions {
  readonly serviceName: string;
  readonly version: string;
  readonly readinessChecks?: ReadinessChecksFn;
}
