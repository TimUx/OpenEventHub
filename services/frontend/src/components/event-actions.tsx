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
  size = 'sm',
}: {
  readonly event: ApiEvent;
  readonly className?: string;
  readonly size?: 'sm' | 'default';
}) {
  const { t } = useI18n();
  const onMap = canShowEventOnMap(event);

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
          className={buttonVariants({ variant: 'outline', size })}
        >
          <MapPinned className="h-3.5 w-3.5" aria-hidden />
          {t('eventActions.showOnMap')}
        </Link>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled
          title={t('eventActions.showOnMapUnavailable')}
        >
          <MapPinned className="h-3.5 w-3.5" aria-hidden />
          {t('eventActions.showOnMap')}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => downloadEventIcs(event, pageUrl())}
        title={t('eventActions.addToCalendarHint')}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
        {t('eventActions.addToCalendar')}
      </Button>
    </div>
  );
}
