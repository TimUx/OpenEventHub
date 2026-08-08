'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import type { EChartsOption } from 'echarts';

import type { HeatmapViewMode } from '../lib/calendar-utils';
import {
  buildDailyHeatmapData,
  calendarRangeForMode,
  chartHeightForMode,
  type HeatmapDatum,
} from '../lib/heatmap-chart-data';
import { cn } from '../lib/utils';

echarts.use([
  CanvasRenderer,
  HeatmapChart,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
]);

function readThemeColors(): {
  readonly primary: string;
  readonly soft: string;
  readonly card: string;
  readonly muted: string;
  readonly foreground: string;
  readonly border: string;
} {
  if (typeof window === 'undefined') {
    return {
      primary: '#1565c0',
      soft: '#e3f2fd',
      card: '#ffffff',
      muted: '#5f6b7a',
      foreground: '#1a1a1a',
      border: '#dde3ea',
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    primary: pick('--primary', '#1565c0'),
    soft: pick('--primary-soft', '#e3f2fd'),
    card: pick('--card', '#ffffff'),
    muted: pick('--muted', '#5f6b7a'),
    foreground: pick('--foreground', '#1a1a1a'),
    border: pick('--border', '#dde3ea'),
  };
}

function buildOption(args: {
  readonly mode: HeatmapViewMode;
  readonly cursor: Date;
  readonly eventsByDay: ReadonlyMap<string, { readonly length: number }>;
  readonly locale: 'de' | 'en';
  readonly eventsLabel: string;
}): EChartsOption {
  const theme = readThemeColors();
  const range = calendarRangeForMode(args.mode, args.cursor);
  const { data, max } = buildDailyHeatmapData(args.eventsByDay, range);
  const dayNames =
    args.locale === 'de'
      ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { value?: HeatmapDatum };
        if (!p.value) return '';
        return `${p.value[0]}<br/>${args.eventsLabel}: <b>${p.value[1]}</b>`;
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(1, max),
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { color: theme.muted, fontSize: 11 },
      inRange: {
        color: [theme.soft, theme.primary],
      },
    },
    calendar: {
      top: args.mode === 'year' ? 40 : 52,
      left: 52,
      right: 20,
      bottom: 44,
      cellSize: args.mode === 'year' ? ['auto', 15] : ['auto', 32],
      range,
      itemStyle: {
        borderWidth: 1,
        borderColor: theme.border,
        color: theme.card,
      },
      splitLine: {
        show: true,
        lineStyle: { color: theme.border, width: 1 },
      },
      yearLabel: {
        show: args.mode === 'year',
        color: theme.foreground,
        fontWeight: 700,
      },
      monthLabel: {
        show: args.mode === 'year' || args.mode === 'month',
        color: theme.muted,
        nameMap: Array.from({ length: 12 }, (_, month) =>
          new Intl.DateTimeFormat(args.locale === 'de' ? 'de-DE' : 'en-US', {
            month: 'short',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(2026, month, 1))),
        ),
      },
      dayLabel: {
        firstDay: 0,
        nameMap: dayNames,
        color: theme.muted,
      },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: data.map(([day, count]) => [day, count] as [string, number]),
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.25)',
          },
        },
      },
    ],
  };
}

export function EventDensityHeatmap({
  mode,
  cursor,
  eventsByDay,
  locale,
  eventsLabel,
  className,
  onDateClick,
}: {
  readonly mode: HeatmapViewMode;
  readonly cursor: Date;
  readonly eventsByDay: ReadonlyMap<string, { readonly length: number }>;
  readonly locale: 'de' | 'en';
  readonly eventsLabel: string;
  readonly className?: string;
  readonly onDateClick?: (isoDay: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const clickRef = useRef(onDateClick);
  clickRef.current = onDateClick;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    chart.on('click', (params) => {
      const value = (params as unknown as { value?: HeatmapDatum }).value;
      if (value?.[0]) {
        clickRef.current?.(value[0]);
      }
    });

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(buildOption({ mode, cursor, eventsByDay, locale, eventsLabel }), {
      notMerge: true,
    });
  }, [mode, cursor, eventsByDay, locale, eventsLabel]);

  return (
    <div
      ref={hostRef}
      className={cn('w-full rounded-xl border border-[var(--border)] bg-[var(--card)]', className)}
      style={{ height: chartHeightForMode(mode) }}
      role="img"
      aria-label={eventsLabel}
    />
  );
}

export default EventDensityHeatmap;
