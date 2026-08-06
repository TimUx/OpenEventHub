'use client';

import { CalendarPlus, Copy, Rss } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../i18n/i18n-provider';
import type { ApiEvent } from '../lib/api';
import { getSiteUrl } from '../lib/api';
import {
  buildCalendarFeedPath,
  buildWebcalSubscribeUrl,
  downloadEventsIcs,
} from '../lib/event-calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function CalendarExportBar({
  events,
  feedQuery,
  calendarName = 'OpenEventHub',
}: {
  readonly events: readonly ApiEvent[];
  readonly feedQuery?: Record<string, string>;
  readonly calendarName?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState(getSiteUrl);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const httpsUrl = useMemo(
    () => `${origin}${buildCalendarFeedPath(feedQuery)}`,
    [feedQuery, origin],
  );
  const webcalUrl = useMemo(() => buildWebcalSubscribeUrl(httpsUrl), [httpsUrl]);

  function copyHttps(): void {
    void navigator.clipboard.writeText(httpsUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadVisible(): void {
    downloadEventsIcs(events, {
      calendarName,
      filename: 'openeventhub-events.ics',
      eventPageUrl: (event) => `${origin}/events/${event.id}`,
    });
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-soft"
      aria-label={t('calendarExport.section')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-bold">{t('calendarExport.title')}</h2>
          <p className="text-sm text-[var(--muted)]">{t('calendarExport.description')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={events.length === 0}
          onClick={downloadVisible}
          title={t('calendarExport.downloadHint')}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {t('calendarExport.download', { count: events.length })}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <label
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            htmlFor="calendar-feed-url"
          >
            {t('calendarExport.subscribeUrl')}
          </label>
          <Input id="calendar-feed-url" readOnly value={httpsUrl} className="font-mono text-xs" />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyHttps}
            title={t('calendarExport.copy')}
          >
            <Copy className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t('calendarExport.copy')}</span>
          </Button>
          <a
            href={webcalUrl}
            className="inline-flex h-11 min-h-tap items-center justify-center gap-2 rounded-xl border-2 border-primary bg-[var(--card)] px-4 text-sm font-semibold text-primary hover:bg-primary-soft"
          >
            <Rss className="h-4 w-4" aria-hidden />
            {t('calendarExport.subscribe')}
          </a>
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]" aria-live="polite">
        {copied ? t('calendarExport.copied') : t('calendarExport.subscribeHint')}
      </p>
    </section>
  );
}
