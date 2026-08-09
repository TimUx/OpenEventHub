/** Resolve a nested dictionary key; fall back to the raw value if missing. */
export function tLabel(t: (key: string) => string, key: string, fallback: string): string {
  const label = t(key);
  return label === key ? fallback : label;
}

export function crawlJobStatusLabel(t: (key: string) => string, status: string): string {
  return tLabel(t, `crawler.status.${status}`, status);
}

export function sourceStatusLabel(t: (key: string) => string, status: string): string {
  return tLabel(t, `sources.statuses.${status}`, status);
}

export function eventStatusLabel(t: (key: string) => string, status: string): string {
  return tLabel(t, `events.status.${status}`, status);
}

export function moderationStatusLabel(t: (key: string) => string, status: string): string {
  return tLabel(t, `moderation.status.${status}`, status);
}

export function queueNameLabel(t: (key: string) => string, name: string): string {
  return tLabel(t, `queues.names.${name}`, name);
}

export function queueCountLabel(t: (key: string) => string, countKey: string): string {
  return tLabel(t, `queues.counts.${countKey}`, countKey);
}

export function adminRoleLabel(t: (key: string) => string, role: string): string {
  return tLabel(t, `users.roles.${role}`, role);
}
