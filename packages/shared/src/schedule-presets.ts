/** Friendly crawl schedule presets → BullMQ/cron expressions (UTC). */

export const SCHEDULE_PRESET_IDS = [
  'manual',
  'hourly',
  'every6h',
  'daily',
  'weekly',
  'monthly',
  'custom',
] as const;

export type SchedulePresetId = (typeof SCHEDULE_PRESET_IDS)[number];

/** Fixed cron patterns for the non-custom presets (5-field, UTC). */
export const SCHEDULE_PRESET_CRONS: Readonly<
  Record<Exclude<SchedulePresetId, 'manual' | 'custom'>, string>
> = {
  hourly: '0 * * * *',
  every6h: '0 */6 * * *',
  daily: '0 6 * * *',
  weekly: '0 6 * * 1',
  monthly: '0 6 1 * *',
};

export const DEFAULT_SCHEDULE_PRESET: SchedulePresetId = 'every6h';

export function normalizeCronExpression(cron: string | null | undefined): string | null {
  if (cron == null) return null;
  const trimmed = cron.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Resolve a preset (+ optional custom field) to a stored cron or null (manual). */
export function cronFromSchedulePreset(
  preset: SchedulePresetId,
  customCron?: string | null,
): string | null {
  if (preset === 'manual') {
    return null;
  }
  if (preset === 'custom') {
    return normalizeCronExpression(customCron);
  }
  return SCHEDULE_PRESET_CRONS[preset];
}

/** Map a stored cron back to a preset id (unknown patterns → custom). */
export function detectSchedulePreset(cron: string | null | undefined): SchedulePresetId {
  const normalized = normalizeCronExpression(cron);
  if (!normalized) {
    return 'manual';
  }
  for (const [id, pattern] of Object.entries(SCHEDULE_PRESET_CRONS) as Array<
    [Exclude<SchedulePresetId, 'manual' | 'custom'>, string]
  >) {
    if (pattern === normalized) {
      return id;
    }
  }
  return 'custom';
}

export function isSchedulePresetId(value: string): value is SchedulePresetId {
  return (SCHEDULE_PRESET_IDS as readonly string[]).includes(value);
}
