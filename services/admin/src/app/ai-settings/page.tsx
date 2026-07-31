'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';

type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure_openai'
  | 'openrouter'
  | 'ollama'
  | 'custom_openai';

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://api.localhost:8088';

export default function AiSettingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@openeventhub.local');
  const [password, setPassword] = useState('ChangeMeNow!');
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

  const authHeaders = useCallback((): HeadersInit => {
    if (!token) {
      return { 'content-type': 'application/json' };
    }
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    };
  }, [token]);

  const loadData = useCallback(async (accessToken: string) => {
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    };
    const [catalogRes, providersRes, settingsRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/admin/ai/providers/catalog`, { headers }),
      fetch(`${API_BASE}/api/v1/admin/ai/providers`, { headers }),
      fetch(`${API_BASE}/api/v1/admin/ai/settings`, { headers }),
    ]);
    if (!catalogRes.ok || !providersRes.ok || !settingsRes.ok) {
      throw new Error('Failed to load AI settings');
    }
    setCatalog((await catalogRes.json()) as CatalogItem[]);
    setProviders((await providersRes.json()) as ProviderProfile[]);
    const settings = (await settingsRes.json()) as { activeProviderProfileId: string | null };
    setActiveId(settings.activeProviderProfileId);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('oeh_admin_token');
    if (!stored) {
      return;
    }
    setToken(stored);
    void loadData(stored).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      window.localStorage.removeItem('oeh_admin_token');
      setToken(null);
    });
  }, [loadData]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setError('Login failed');
      return;
    }
    const payload = (await response.json()) as { accessToken: string };
    window.localStorage.setItem('oeh_admin_token', payload.accessToken);
    setToken(payload.accessToken);
    await loadData(payload.accessToken);
    setMessage('Signed in');
  }

  async function onCreateProvider(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch(`${API_BASE}/api/v1/admin/ai/providers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name,
        type,
        baseUrl: baseUrl || null,
        model,
        apiKey: apiKey || null,
        enabled: true,
      }),
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    setApiKey('');
    setMessage('Provider profile created');
    if (token) {
      await loadData(token);
    }
  }

  async function activate(id: string) {
    setError(null);
    const response = await fetch(`${API_BASE}/api/v1/admin/ai/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ activeProviderProfileId: id }),
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    setActiveId(id);
    setMessage('Active provider updated');
  }

  async function testProvider(id: string) {
    setError(null);
    const response = await fetch(`${API_BASE}/api/v1/admin/ai/providers/${id}/test`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    const payload = (await response.json()) as { sample: string; model: string; provider: string };
    setMessage(`Test OK (${payload.provider}/${payload.model}): ${payload.sample}`);
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
    return (
      <main style={styles.main}>
        <h1>AI Settings</h1>
        <p>Sign in to configure ChatGPT, Claude, Gemini, Ollama, and more.</p>
        <form
          onSubmit={(event) => {
            void onLogin(event);
          }}
          style={styles.card}
        >
          <label style={styles.label}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </label>
          <button type="submit" style={styles.button}>
            Sign in
          </button>
        </form>
        {error ? <p style={styles.error}>{error}</p> : null}
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <h1>AI Settings</h1>
      <p>
        Configure online providers (ChatGPT, Claude, Gemini, …) or local runtimes (Ollama). The
        Event Intelligence Engine uses the <strong>active</strong> profile.
      </p>

      <section style={styles.card}>
        <h2>Provider profiles</h2>
        <ul style={styles.list}>
          {providers.map((provider) => (
            <li key={provider.id} style={styles.listItem}>
              <div>
                <strong>{provider.name}</strong> · {provider.type} · {provider.model}
                {provider.hasApiKey ? ` · key ${provider.apiKeyHint}` : ' · no API key'}
                {activeId === provider.id ? ' · ACTIVE' : ''}
              </div>
              <div style={styles.row}>
                <button type="button" style={styles.button} onClick={() => void activate(provider.id)}>
                  Set active
                </button>
                <button
                  type="button"
                  style={styles.secondary}
                  onClick={() => void testProvider(provider.id)}
                >
                  Test
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={styles.card}>
        <h2>Add provider</h2>
        <form
          onSubmit={(event) => {
            void onCreateProvider(event);
          }}
        >
          <label style={styles.label}>
            Type
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as ProviderType)}
              style={styles.input}
            >
              {(catalog.length > 0
                ? catalog
                : ([{ type, label: type, defaultBaseUrl: null, defaultModel: model, requiresApiKey: true }] as CatalogItem[])
              ).map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            Base URL {selectedCatalog?.requiresApiKey === false ? '(optional for some locals)' : ''}
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            Model
            <input value={model} onChange={(e) => setModel(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.input}
              placeholder={selectedCatalog?.requiresApiKey ? 'required' : 'optional for Ollama'}
            />
          </label>
          <button type="submit" style={styles.button}>
            Save profile
          </button>
        </form>
      </section>

      {message ? <p style={styles.message}>{message}</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    fontFamily: 'Georgia, serif',
    maxWidth: 880,
    margin: '0 auto',
    padding: '2rem 1.25rem 4rem',
    background: 'linear-gradient(180deg, #f7f3ea 0%, #efe7d8 100%)',
    minHeight: '100vh',
    color: '#1d1a16',
  },
  card: {
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid #d9cbb3',
    padding: '1.25rem',
    marginTop: '1.25rem',
  },
  label: { display: 'grid', gap: 6, marginBottom: 12, fontSize: 14 },
  input: {
    padding: '0.65rem 0.75rem',
    border: '1px solid #cbbfa8',
    background: '#fffdf8',
    font: 'inherit',
  },
  button: {
    padding: '0.55rem 0.9rem',
    border: '1px solid #3f5d45',
    background: '#3f5d45',
    color: '#f7f3ea',
    cursor: 'pointer',
  },
  secondary: {
    padding: '0.55rem 0.9rem',
    border: '1px solid #3f5d45',
    background: 'transparent',
    color: '#3f5d45',
    cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 },
  listItem: {
    display: 'grid',
    gap: 8,
    paddingBottom: 12,
    borderBottom: '1px solid #e2d6c2',
  },
  row: { display: 'flex', gap: 8 },
  message: { color: '#2f5d3a' },
  error: { color: '#8a2f2f' },
};
