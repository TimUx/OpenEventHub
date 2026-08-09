'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminRoleLabel } from '../../i18n/labels';
import { adminFetch } from '../../lib/api';

type ProfileUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

type ProfileUpdateResponse = {
  user: { id: string; email: string; role: string };
  accessToken: string;
};

export default function ProfilePage() {
  const { t } = useI18n();
  const { token, applySession } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<ProfileUser>('/api/v1/admin/me');

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.email) setEmail(data.email);
  }, [data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || !data) return;
    setMessage(null);
    setFormError(null);

    const emailChanged = email.trim().toLowerCase() !== data.email.toLowerCase();
    const passwordChanged = Boolean(newPassword);
    if (!emailChanged && !passwordChanged) {
      setFormError(t('profile.nothingToUpdate'));
      return;
    }
    if (!currentPassword) {
      setFormError(t('profile.currentPasswordRequired'));
      return;
    }
    if (passwordChanged) {
      if (newPassword.length < 8) {
        setFormError(t('profile.passwordTooShort'));
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError(t('profile.passwordMismatch'));
        return;
      }
    }

    setSaving(true);
    try {
      const body: {
        currentPassword: string;
        email?: string;
        password?: string;
      } = { currentPassword };
      if (emailChanged) body.email = email.trim();
      if (passwordChanged) body.password = newPassword;

      const result = await adminFetch<ProfileUpdateResponse>('/api/v1/admin/me', token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      applySession(result.accessToken, result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(t('profile.updated'));
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading && !data ? (
        <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p>
      ) : null}

      {data ? (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusPill value={adminRoleLabel(t, data.role)} />
            <span className="text-xs text-[var(--muted)]">
              {t('users.since', { date: new Date(data.createdAt).toLocaleDateString() })}
            </span>
          </div>
          <form className="grid max-w-xl gap-3" onSubmit={(e) => void onSubmit(e)}>
            <label className="text-sm font-semibold">
              {t('users.email')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-normal"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label className="text-sm font-semibold">
              {t('profile.currentPassword')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-normal"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label className="text-sm font-semibold">
              {t('profile.newPassword')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-normal"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                placeholder={t('profile.newPasswordHint')}
              />
            </label>
            <label className="text-sm font-semibold">
              {t('profile.confirmPassword')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-normal"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="h-10 w-fit rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving || !token}
            >
              {t('profile.save')}
            </button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
