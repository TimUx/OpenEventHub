'use client';

import Link from 'next/link';
import { CalendarPlus, MapPinned } from 'lucide-react';

import { useI18n } from '../i18n/i18n-provider';
import type { ApiEvent } from '../lib/api';
import { getSiteUrl } from '../lib/api';
import { buildEventMapHref, canShowEventOnMap, downloadEventIcs } from '../lib/event-calendar';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './ui/button';

export function EventActions({
  event,
  className,
}: {
  readonly event: ApiEvent;
  readonly className?: string;
}) {
  const { t } = useI18n();
  const onMap = canShowEventOnMap(event);
  const mapLabel = onMap ? t('eventActions.showOnMap') : t('eventActions.showOnMapUnavailable');
  const calendarLabel = t('eventActions.addToCalendar');
  const calendarHint = t('eventActions.addToCalendarHint');

  function pageUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/events/${event.id}`;
    }
    return `${getSiteUrl()}/events/${event.id}`;
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      onClick={(clickEvent) => clickEvent.stopPropagation()}
      onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
    >
      {onMap ? (
        <Link
          href={buildEventMapHref(event.id)}
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
          aria-label={mapLabel}
          title={mapLabel}
        >
          <MapPinned className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled
          aria-label={mapLabel}
          title={mapLabel}
        >
          <MapPinned className="h-4 w-4" aria-hidden />
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => downloadEventIcs(event, pageUrl())}
        aria-label={calendarLabel}
        title={calendarHint}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
