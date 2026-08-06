import { detectSchedulePreset } from '@openeventhub/shared';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Human-readable update interval for stored UTC cron (or null). */
export function formatScheduleLabel(t: Translate, cron: string | null | undefined): string {
  const preset = detectSchedulePreset(cron);
  if (preset === 'custom') {
    return t('schedule.customValue', { cron: cron?.trim() || '—' });
  }
  return t(`schedule.${preset}`);
}
