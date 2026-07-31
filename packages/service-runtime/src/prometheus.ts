/**
 * Escapes a label value for Prometheus text exposition format.
 */
export function escapePrometheusLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

export function formatNodeVersionInfo(version: string): string {
  const match = /^v(\d+)\.(\d+)\.(\d+)/.exec(version);
  const major = match?.[1] ?? '0';
  const minor = match?.[2] ?? '0';
  const patch = match?.[3] ?? '0';

  return `nodejs_version_info{version="${escapePrometheusLabel(version)}",major="${major}",minor="${minor}",patch="${patch}"} 1`;
}
