'use client';

import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'oeh_view_';

export function usePersistedViewMode<T extends string>(
  key: string,
  defaultValue: T,
  allowed: ReadonlyArray<T>,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (stored && (allowed as readonly string[]).includes(stored)) {
        setValue(stored as T);
      }
    } catch {
      // ignore storage errors
    }
  }, [allowed, key]);

  function update(next: T): void {
    setValue(next);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, next);
    } catch {
      // ignore
    }
  }

  return [value, update];
}
