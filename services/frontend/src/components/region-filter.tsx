'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { useI18n } from '../i18n/i18n-provider';
import type { ApiRegion } from '../lib/api';
import {
  buildRegionOptions,
  filterRegionOptions,
  findRegionOption,
  type RegionOption,
} from '../lib/region-tree';
import { cn } from '../lib/utils';
import { Input } from './ui/input';

const TYPE_I18N: Record<string, string> = {
  country: 'regionFilter.type.country',
  state: 'regionFilter.type.state',
  district: 'regionFilter.type.district',
  municipality: 'regionFilter.type.municipality',
  city: 'regionFilter.type.municipality',
  suburb: 'regionFilter.type.suburb',
};

export function RegionFilter({
  id,
  regions,
  value,
  onChange,
  anyLabel,
  className,
  valueKey = 'id',
}: {
  readonly id?: string;
  readonly regions: readonly ApiRegion[];
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly anyLabel: string;
  readonly className?: string;
  /** Which field is stored in `value` (search historically used names). */
  readonly valueKey?: 'id' | 'name' | 'slug';
}) {
  const { t } = useI18n();
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const options = useMemo(() => buildRegionOptions(regions), [regions]);
  const selected = findRegionOption(options, value, valueKey);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => filterRegionOptions(options, query), [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    function onDocPointer(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, []);

  function typeLabel(type: string): string {
    const key = TYPE_I18N[type];
    return key ? t(key) : type;
  }

  function selectOption(option: RegionOption | null): void {
    onChange(option ? option[valueKey] : '');
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (open && filtered[highlight]) {
        selectOption(filtered[highlight]);
      } else {
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  const displayValue = open ? query : (selected?.name ?? '');

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t('regionFilter.search')}
          value={displayValue}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="pr-16"
        />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              className="pointer-events-auto rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label={t('regionFilter.clear')}
              onClick={() => {
                selectOption(null);
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <ChevronsUpDown className="h-4 w-4 text-[var(--muted)]" aria-hidden />
        </div>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--primary-soft)]',
                !value ? 'font-semibold text-primary' : '',
              )}
              onClick={() => selectOption(null)}
            >
              {anyLabel}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">{t('regionFilter.noMatches')}</li>
          ) : (
            filtered.map((option, index) => {
              const prev = filtered[index - 1];
              const showGroup = !prev || prev.groupKey !== option.groupKey;
              const isSelected = value === option[valueKey];
              const isActive = index === highlight;
              return (
                <li key={option.id} role="presentation">
                  {showGroup ? (
                    <div className="sticky top-0 bg-[var(--card)] px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {typeLabel(option.groupKey)}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-[var(--primary-soft)]',
                      isActive || isSelected ? 'bg-[var(--primary-soft)]' : '',
                      isSelected ? 'font-semibold text-primary' : '',
                    )}
                    style={{ paddingLeft: `${12 + option.depth * 14}px` }}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span>{option.name}</span>
                    {option.pathLabel ? (
                      <span className="text-xs text-[var(--muted)]">{option.pathLabel}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
