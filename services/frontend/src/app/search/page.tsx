'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useTransition, type FormEvent } from 'react';

import { EventCard } from '../../components/event-card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getPublicApiBase, listCategories, listRegions, type ApiEvent } from '../../lib/api';

async function fetchSearch(q: string): Promise<ApiEvent[]> {
  const query = new URLSearchParams({ q, limit: '50' });
  const response = await fetch(`${getPublicApiBase()}/api/v1/search?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return (await response.json()) as ApiEvent[];
}

function matchesDate(event: ApiEvent, date: string): boolean {
  if (!date) {
    return true;
  }
  return event.startAt.slice(0, 10) === date;
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [region, setRegion] = useState(params.get('region') ?? '');
  const [date, setDate] = useState(params.get('date') ?? '');
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [pending, startTransition] = useTransition();

  const effectiveQuery = [initialQ, category, region].filter(Boolean).join(' ').trim();

  const { data: rawEvents = [], isFetching } = useQuery({
    queryKey: ['search', effectiveQuery],
    queryFn: () => fetchSearch(effectiveQuery || ' '),
    enabled: effectiveQuery.length > 0,
  });

  const events = rawEvents
    .filter((event) => matchesDate(event, date))
    .slice()
    .sort((a, b) => {
      if (sort === 'date') {
        return a.startAt.localeCompare(b.startAt);
      }
      return 0;
    });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: listRegions,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (category) next.set('category', category);
    if (region) next.set('region', region);
    if (date) next.set('date', date);
    if (sort !== 'relevance') next.set('sort', sort);
    startTransition(() => {
      router.push(`/search?${next.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Search</h1>
        <p className="text-[var(--muted)]">
          Filter by free text, category, region, and date. Sort by relevance or start date.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:grid-cols-4"
        role="search"
      >
        <div className="md:col-span-2">
          <label
            className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]"
            htmlFor="q"
          >
            Free text
          </label>
          <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Open Air…" />
        </div>
        <div>
          <label
            className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]"
            htmlFor="category"
          >
            Category
          </label>
          <select
            id="category"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Any</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]"
            htmlFor="region"
          >
            Region
          </label>
          <select
            id="region"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Any</option>
            {regions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]"
            htmlFor="date"
          >
            Date
          </label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label
            className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]"
            htmlFor="sort"
          >
            Sort
          </label>
          <select
            id="sort"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Searching…' : 'Apply filters'}
          </Button>
        </div>
      </form>

      {!effectiveQuery ? (
        <p className="text-sm text-[var(--muted)]">
          Enter a query or choose filters to see results.
        </p>
      ) : isFetching ? (
        <p className="text-sm text-[var(--muted)]">Searching…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No results for “{effectiveQuery}”.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading search…</p>}>
      <SearchInner />
    </Suspense>
  );
}
