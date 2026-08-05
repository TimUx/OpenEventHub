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

export default function AiSettingsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('ChatGPT Production');
  const [type, setType] = useState<ProviderType>('openai');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');

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

  async function onCreateProvider(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    await adminFetch('/api/v1/admin/ai/providers', token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        baseUrl: baseUrl || null,
        model,
        apiKey: apiKey || null,
        enabled: true,
      }),
    });
    setApiKey('');
    setMessage(t('aiSettings.providerCreated'));
    await loadData(token);
  }

  async function activate(id: string) {
    if (!token) return;
    await adminFetch('/api/v1/admin/ai/settings', token, {
      method: 'PUT',
      body: JSON.stringify({ activeProviderProfileId: id }),
    });
    setActiveId(id);
    setMessage(t('aiSettings.activeUpdated'));
  }

  async function testProvider(id: string) {
    if (!token) return;
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
  }

  function onTypeChange(next: ProviderType) {
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
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/60 pb-3"
            >
              <div className="text-sm">
                <strong>{provider.name}</strong> · {provider.type} · {provider.model}
                {provider.hasApiKey
                  ? ` · ${t('aiSettings.keyHint', { hint: provider.apiKeyHint ?? '' })}`
                  : ` · ${t('aiSettings.noApiKey')}`}
                {activeId === provider.id ? ` · ${t('aiSettings.active')}` : ''}
              </div>
              <div className="flex gap-2">
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
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-bold text-lg">{t('aiSettings.addProvider')}</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onCreateProvider(e)}>
          <label className="text-sm">
            {t('aiSettings.type')}
            <select
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={type}
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
                      requiresApiKey: true,
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
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {selectedCatalog?.requiresApiKey
              ? t('aiSettings.apiKey')
              : t('aiSettings.apiKeyOptional')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <button type="submit" className="h-10 rounded-xl bg-primary text-white md:col-span-2">
            {t('aiSettings.saveProfile')}
          </button>
        </form>
      </Panel>
    </div>
  );
}
