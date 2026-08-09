'use client';

import { useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminRoleLabel } from '../../i18n/labels';
import { adminFetch } from '../../lib/api';

type User = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

const ROLES = ['admin', 'moderator', 'viewer'] as const;

export default function UsersPage() {
  const { t } = useI18n();
  const { token, user: sessionUser } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<User[]>('/api/v1/admin/users');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('moderator');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('moderator');
  const [editPassword, setEditPassword] = useState('');

  function startEdit(user: User): void {
    setEditingId(user.id);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword('');
    setFormError(null);
    setMessage(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setEditEmail('');
    setEditPassword('');
    setFormError(null);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage(null);
    setFormError(null);
    try {
      await adminFetch('/api/v1/admin/users', token, {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      setEmail('');
      setPassword('');
      setMessage(t('users.created'));
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!token || !editingId) return;
    setMessage(null);
    setFormError(null);
    try {
      const body: { email: string; role: string; password?: string } = {
        email: editEmail,
        role: editRole,
      };
      if (editPassword.trim()) {
        body.password = editPassword;
      }
      await adminFetch(`/api/v1/admin/users/${editingId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setMessage(t('users.updated'));
      cancelEdit();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(id: string) {
    if (!token) return;
    if (!window.confirm(t('users.confirmDelete'))) return;
    setMessage(null);
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/users/${id}`, token, { method: 'DELETE' });
      if (editingId === id) cancelEdit();
      setMessage(t('users.deleted'));
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('users.title')} description={t('users.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Panel>
        <h2 className="mb-3 font-bold text-lg">{t('users.createUser')}</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => void onCreate(e)}>
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder={t('users.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder={t('users.passwordMin')}
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
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {adminRoleLabel(t, value)}
              </option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-xl bg-primary text-white">
            {t('common.create')}
          </button>
        </form>
      </Panel>

      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((user) => {
          const isEditing = editingId === user.id;
          const isSelf = sessionUser?.id === user.id;
          return (
            <Panel key={user.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {user.email}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-semibold text-[var(--muted)]">
                        ({t('users.you')})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {t('users.since', { date: new Date(user.createdAt).toLocaleDateString() })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill value={adminRoleLabel(t, user.role)} />
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold"
                        onClick={() => startEdit(user)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                        disabled={isSelf}
                        title={isSelf ? t('users.cannotDeleteSelf') : undefined}
                        onClick={() => void remove(user.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {isEditing ? (
                <form
                  className="grid gap-3 border-t border-[var(--border)] pt-3 md:grid-cols-2"
                  onSubmit={(e) => void onSaveEdit(e)}
                >
                  <label className="text-sm">
                    {t('users.email')}
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    {t('users.role')}
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      {ROLES.map((value) => (
                        <option key={value} value={value}>
                          {adminRoleLabel(t, value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm md:col-span-2">
                    {t('users.newPasswordOptional')}
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </label>
                  <div className="flex gap-2 md:col-span-2">
                    <button
                      type="submit"
                      className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
                    >
                      {t('users.saveChanges')}
                    </button>
                    <button
                      type="button"
                      className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold"
                      onClick={cancelEdit}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
