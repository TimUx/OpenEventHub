'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

type ProviderType =
  'openai' | 'anthropic' | 'google' | 'azure_openai' | 'openrouter' | 'ollama' | 'custom_openai';

type CatalogItem = {
  type: ProviderType;
  label: string;
  defaultBaseUrl: string | null;
  defaultModel: string;
  requiresApiKey: boolean;
};

type ProviderProfile = {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string | null;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyHint: string | null;
};

const EMPTY_FORM = {
  name: 'Local Ollama',
  type: 'ollama' as ProviderType,
  baseUrl: 'http://ollama:11434/v1',
  model: 'llama3.2',
  apiKey: '',
  enabled: true,
};

export default function AiSettingsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(EMPTY_FORM.name);
  const [type, setType] = useState<ProviderType>(EMPTY_FORM.type);
  const [baseUrl, setBaseUrl] = useState(EMPTY_FORM.baseUrl);
  const [model, setModel] = useState(EMPTY_FORM.model);
  const [apiKey, setApiKey] = useState(EMPTY_FORM.apiKey);
  const [enabled, setEnabled] = useState(EMPTY_FORM.enabled);
  const [saving, setSaving] = useState(false);

  const selectedCatalog = useMemo(
    () => catalog.find((item) => item.type === type),
    [catalog, type],
  );

  const loadData = useCallback(async (accessToken: string) => {
    const [catalogData, providersData, settings] = await Promise.all([
      adminFetch<CatalogItem[]>('/api/v1/admin/ai/providers/catalog', accessToken),
      adminFetch<ProviderProfile[]>('/api/v1/admin/ai/providers', accessToken),
      adminFetch<{ activeProviderProfileId: string | null }>(
        '/api/v1/admin/ai/settings',
        accessToken,
      ),
    ]);
    setCatalog(catalogData);
    setProviders(providersData);
    setActiveId(settings.activeProviderProfileId);
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadData(token).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [token, loadData]);

  function resetForm(catalogItems: CatalogItem[] = catalog) {
    const ollama = catalogItems.find((item) => item.type === 'ollama');
    setEditingId(null);
    setType('ollama');
    setName(ollama?.label ?? EMPTY_FORM.name);
    setBaseUrl(ollama?.defaultBaseUrl ?? EMPTY_FORM.baseUrl);
    setModel(ollama?.defaultModel ?? EMPTY_FORM.model);
    setApiKey('');
    setEnabled(true);
  }

  function startEdit(provider: ProviderProfile) {
    setEditingId(provider.id);
    setName(provider.name);
    setType(provider.type);
    setBaseUrl(provider.baseUrl ?? '');
    setModel(provider.model);
    setApiKey('');
    setEnabled(provider.enabled);
    setMessage(null);
    setError(null);
  }

  async function onSubmitProvider(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          name,
          baseUrl: baseUrl || null,
          model,
          enabled,
        };
        if (apiKey.trim()) {
          body.apiKey = apiKey.trim();
        }
        await adminFetch(`/api/v1/admin/ai/providers/${editingId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMessage(t('aiSettings.providerUpdated'));
      } else {
        await adminFetch('/api/v1/admin/ai/providers', token, {
          method: 'POST',
          body: JSON.stringify({
            name,
            type,
            baseUrl: baseUrl || null,
            model,
            apiKey: apiKey || null,
            enabled,
          }),
        });
        setMessage(t('aiSettings.providerCreated'));
      }
      setApiKey('');
      resetForm();
      await loadData(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProvider(provider: ProviderProfile) {
    if (!token) return;
    const confirmed = window.confirm(t('aiSettings.confirmDelete', { name: provider.name }));
    if (!confirmed) return;
    setError(null);
    try {
      await adminFetch(`/api/v1/admin/ai/providers/${provider.id}`, token, {
        method: 'DELETE',
      });
      if (editingId === provider.id) {
        resetForm();
      }
      setMessage(t('aiSettings.providerDeleted'));
      await loadData(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function activate(id: string) {
    if (!token) return;
    setError(null);
    try {
      await adminFetch('/api/v1/admin/ai/settings', token, {
        method: 'PUT',
        body: JSON.stringify({ activeProviderProfileId: id }),
      });
      setActiveId(id);
      setMessage(t('aiSettings.activeUpdated'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function testProvider(id: string) {
    if (!token) return;
    setError(null);
    try {
      const payload = await adminFetch<{ sample: string; model: string; provider: string }>(
        `/api/v1/admin/ai/providers/${id}/test`,
        token,
        { method: 'POST' },
      );
      setMessage(
        t('aiSettings.testOk', {
          provider: payload.provider,
          model: payload.model,
          sample: payload.sample,
        }),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function onTypeChange(next: ProviderType) {
    if (editingId) {
      // Type is immutable on update (API has no type field on PATCH).
      return;
    }
    setType(next);
    const item = catalog.find((entry) => entry.type === next);
    if (item) {
      setBaseUrl(item.defaultBaseUrl ?? '');
      setModel(item.defaultModel);
      setName(item.label);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('aiSettings.title')} description={t('aiSettings.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Panel>
        <h2 className="mb-3 font-bold text-lg">{t('aiSettings.providerProfiles')}</h2>
        {providers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('aiSettings.noProfiles')}</p>
        ) : (
          <ul className="space-y-3">
            {providers.map((provider) => (
              <li
                key={provider.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/60 pb-3"
              >
                <div className="text-sm">
                  <strong>{provider.name}</strong> · {provider.type} · {provider.model}
                  {!provider.enabled ? ` · ${t('aiSettings.disabled')}` : ''}
                  {provider.hasApiKey
                    ? ` · ${t('aiSettings.keyHint', { hint: provider.apiKeyHint ?? '' })}`
                    : ` · ${t('aiSettings.noApiKey')}`}
                  {activeId === provider.id ? ` · ${t('aiSettings.active')}` : ''}
                  {provider.baseUrl ? (
                    <div className="mt-0.5 text-xs text-[var(--muted)]">{provider.baseUrl}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs text-white"
                    onClick={() => void activate(provider.id)}
                  >
                    {t('aiSettings.setActive')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
                    onClick={() => void testProvider(provider.id)}
                  >
                    {t('aiSettings.test')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
                    onClick={() => startEdit(provider)}
                  >
                    {t('aiSettings.edit')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
                    onClick={() => void deleteProvider(provider)}
                  >
                    {t('aiSettings.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="mb-3 font-bold text-lg">
          {editingId ? t('aiSettings.editProvider') : t('aiSettings.addProvider')}
        </h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmitProvider(e)}>
          <label className="text-sm">
            {t('aiSettings.type')}
            <select
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 disabled:opacity-60"
              value={type}
              disabled={Boolean(editingId)}
              onChange={(e) => onTypeChange(e.target.value as ProviderType)}
            >
              {(catalog.length > 0
                ? catalog
                : ([
                    {
                      type,
                      label: type,
                      defaultBaseUrl: null,
                      defaultModel: model,
                      requiresApiKey: type !== 'ollama',
                    },
                  ] as CatalogItem[])
              ).map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t('aiSettings.name')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm md:col-span-2">
            {t('aiSettings.baseUrl')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t('aiSettings.model')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={model}
              required
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {selectedCatalog?.requiresApiKey || type !== 'ollama'
              ? editingId
                ? t('aiSettings.apiKeyLeaveBlank')
                : t('aiSettings.apiKey')
              : t('aiSettings.apiKeyOptional')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              type="password"
              value={apiKey}
              autoComplete="off"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t('aiSettings.enabled')}
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl bg-primary px-4 text-white disabled:opacity-60"
            >
              {editingId ? t('aiSettings.saveChanges') : t('aiSettings.saveProfile')}
            </button>
            {editingId ? (
              <button
                type="button"
                className="h-10 rounded-xl border border-[var(--border)] px-4"
                onClick={() => resetForm()}
              >
                {t('aiSettings.cancelEdit')}
              </button>
            ) : null}
          </div>
        </form>
      </Panel>
    </div>
  );
}
