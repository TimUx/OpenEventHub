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
import { CollapsiblePanel } from './collapsible-panel';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function CalendarExportBar({
  events,
  feedQuery,
  calendarName = 'OpenEventHub',
  defaultOpen = false,
}: {
  readonly events: readonly ApiEvent[];
  readonly feedQuery?: Record<string, string>;
  readonly calendarName?: string;
  /** When false (default), the export/subscribe tools stay collapsed. */
  readonly defaultOpen?: boolean;
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
    <CollapsiblePanel
      title={t('calendarExport.toggle')}
      {...(events.length > 0 ? { badge: String(events.length) } : {})}
      defaultOpen={defaultOpen}
      className="shadow-none"
    >
      <div className="space-y-3" aria-label={t('calendarExport.section')}>
        <p className="text-sm text-[var(--muted)]">{t('calendarExport.description')}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={events.length === 0}
            onClick={downloadVisible}
            title={t('calendarExport.downloadHint')}
            className="h-9 min-h-0 px-3 text-sm"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {t('calendarExport.download', { count: events.length })}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0">
            <label
              className="mb-1 block text-xs font-medium text-[var(--muted)]"
              htmlFor="calendar-feed-url"
            >
              {t('calendarExport.subscribeUrl')}
            </label>
            <Input
              id="calendar-feed-url"
              readOnly
              value={httpsUrl}
              className="h-9 min-h-0 font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 min-h-0 min-w-9"
              onClick={copyHttps}
              title={t('calendarExport.copy')}
            >
              <Copy className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t('calendarExport.copy')}</span>
            </Button>
            <a
              href={webcalUrl}
              className="inline-flex h-9 min-h-0 items-center justify-center gap-2 rounded-xl border border-primary px-3 text-sm font-medium text-primary hover:bg-primary-soft"
            >
              <Rss className="h-4 w-4" aria-hidden />
              {t('calendarExport.subscribe')}
            </a>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]" aria-live="polite">
          {copied ? t('calendarExport.copied') : t('calendarExport.subscribeHint')}
        </p>
      </div>
    </CollapsiblePanel>
  );
}
