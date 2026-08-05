'use client';

import { useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { adminFetch } from '../../lib/api';

type User = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<User[]>('/api/v1/admin/users');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('moderator');
  const [message, setMessage] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage(null);
    try {
      await adminFetch('/api/v1/admin/users', token, {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      setEmail('');
      setPassword('');
      setMessage('User created');
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function changeRole(id: string, nextRole: string) {
    if (!token) return;
    await adminFetch(`/api/v1/admin/users/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ role: nextRole }),
    });
    await reload();
  }

  async function remove(id: string) {
    if (!token) return;
    if (!window.confirm('Delete user?')) return;
    await adminFetch(`/api/v1/admin/users/${id}`, token, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Admin accounts with RBAC roles." />
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Panel>
        <h2 className="mb-3 font-display text-lg">Create user</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => void onCreate(e)}>
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder="Password (min 8)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <select
            className="h-10 rounded-md border border-[var(--border)] px-3"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">admin</option>
            <option value="moderator">moderator</option>
            <option value="viewer">viewer</option>
          </select>
          <button type="submit" className="h-10 rounded-md bg-accent text-white">
            Create
          </button>
        </form>
      </Panel>

      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((user) => (
          <Panel key={user.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-xs text-[var(--muted)]">
                since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill value={user.role} />
              <select
                className="h-8 rounded-md border border-[var(--border)] px-2 text-xs"
                value={user.role}
                onChange={(e) => void changeRole(user.id, e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="moderator">moderator</option>
                <option value="viewer">viewer</option>
              </select>
              <button
                type="button"
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void remove(user.id)}
              >
                Delete
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
