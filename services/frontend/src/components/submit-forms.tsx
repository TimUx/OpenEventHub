'use client';

import { useState, type FormEvent } from 'react';
import { CalendarPlus, Rss } from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { useI18n } from '../i18n/i18n-provider';
import { submitEvent, submitSource } from '../lib/api';
import { cn } from '../lib/utils';

type SubmitKind = 'event' | 'source';

const PLUGIN_TYPES = ['rss', 'html', 'ics'] as const;

export function SubmitForms() {
  const { t } = useI18n();
  const [kind, setKind] = useState<SubmitKind>('event');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [eventUrl, setEventUrl] = useState('');

  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [pluginType, setPluginType] = useState<(typeof PLUGIN_TYPES)[number]>('rss');
  const [scheduleCron, setScheduleCron] = useState('0 */6 * * *');
  const [notes, setNotes] = useState('');

  async function onSubmitEvent(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitEvent({
        ...(email.trim() ? { submitterEmail: email.trim() } : {}),
        payload: {
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : null,
          summary: summary.trim() || null,
          description: description.trim() || null,
          venueName: venueName.trim() || null,
          city: city.trim() || null,
          url: eventUrl.trim() || null,
        },
      });
      setMessage(t('submit.successEvent', { id: result.id }));
      setTitle('');
      setStartAt('');
      setEndAt('');
      setSummary('');
      setDescription('');
      setVenueName('');
      setCity('');
      setEventUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function onSubmitSource(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitSource({
        ...(email.trim() ? { submitterEmail: email.trim() } : {}),
        payload: {
          name: sourceName.trim(),
          url: sourceUrl.trim(),
          pluginType,
          scheduleCron: scheduleCron.trim() || null,
          notes: notes.trim() || null,
        },
      });
      setMessage(t('submit.successSource', { id: result.id }));
      setSourceName('');
      setSourceUrl('');
      setPluginType('rss');
      setScheduleCron('0 */6 * * *');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t('submit.title')}</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t('submit.description')}</p>
      </header>

      <div
        role="tablist"
        aria-label={t('submit.tabs')}
        className="inline-flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-soft"
      >
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'event'}
          className={cn(
            'inline-flex min-h-tap items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
            kind === 'event'
              ? 'bg-primary text-primary-contrast'
              : 'text-[var(--muted)] hover:bg-primary-soft hover:text-primary',
          )}
          onClick={() => {
            setKind('event');
            setMessage(null);
            setError(null);
          }}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t('submit.tabEvent')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'source'}
          className={cn(
            'inline-flex min-h-tap items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
            kind === 'source'
              ? 'bg-primary text-primary-contrast'
              : 'text-[var(--muted)] hover:bg-primary-soft hover:text-primary',
          )}
          onClick={() => {
            setKind('source');
            setMessage(null);
            setError(null);
          }}
        >
          <Rss className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t('submit.tabSource')}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-soft md:p-6">
        <label className="mb-4 block text-sm font-semibold">
          {t('submit.email')}
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('submit.emailPlaceholder')}
            autoComplete="email"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
            {t('submit.emailHint')}
          </span>
        </label>

        {kind === 'event' ? (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmitEvent(e)}>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.eventTitle')}
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              {t('submit.startAt')}
              <Input
                className="mt-1"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              {t('submit.endAt')}
              <Input
                className="mt-1"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              {t('submit.venue')}
              <Input
                className="mt-1"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              {t('submit.city')}
              <Input className="mt-1" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.eventUrl')}
              <Input
                className="mt-1"
                type="url"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                placeholder="https://"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.summary')}
              <Input
                className="mt-1"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.descriptionField')}
              <textarea
                className="mt-1 min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <Button type="submit" size="lg" className="md:col-span-2" disabled={pending}>
              {pending ? t('submit.sending') : t('submit.sendEvent')}
            </Button>
          </form>
        ) : (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmitSource(e)}>
            <label className="text-sm font-semibold">
              {t('submit.sourceName')}
              <Input
                className="mt-1"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              {t('submit.pluginType')}
              <select
                className="mt-1 h-11 min-h-tap w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                value={pluginType}
                onChange={(e) => setPluginType(e.target.value as (typeof PLUGIN_TYPES)[number])}
              >
                {PLUGIN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.sourceUrl')}
              <Input
                className="mt-1"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://"
                required
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.cron')}
              <Input
                className="mt-1"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                placeholder="0 */6 * * *"
              />
              <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                {t('submit.cronHint')}
              </span>
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {t('submit.notes')}
              <textarea
                className="mt-1 min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Button type="submit" size="lg" className="md:col-span-2" disabled={pending}>
              {pending ? t('submit.sending') : t('submit.sendSource')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
