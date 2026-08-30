'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import { COLORS } from '@/lib/theme';

export default function BrokerSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', location: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [notifications, setNotifications] = useState({ newForYou: true, accountActivity: true, autoPlay: true });
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    webApi.brokerProfile(token)
      .then((data: any) => {
        setProfile(data);
        setForm({
          fullName: data.username || data.fullName || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          location: data.location || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
    setSaving(true);
    try {
      await webApi.brokerUpdateProfile(token, {
        username: form.fullName,
        email: form.email,
        phoneNumber: form.phone,
        location: form.location,
      });
      setMessage('Profile updated successfully');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setMessage('Passwords do not match');
      return;
    }
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
    setSaving(true);
    try {
      await webApi.brokerChangePassword(token, { currentPassword: passwordForm.current, newPassword: passwordForm.newPassword });
      setMessage('Password changed successfully');
      setPasswordForm({ current: '', newPassword: '', confirm: '' });
    } catch {
      setMessage('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('zcanopy_token');
    localStorage.removeItem('zcanopy_role');
    localStorage.removeItem('zcanopy_user');
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token || !deleteConfirm) return;
    setSaving(true);
    try {
      await webApi.brokerDeleteAccount(token, { password: deleteConfirm });
      localStorage.removeItem('zcanopy_token');
      localStorage.removeItem('zcanopy_role');
      localStorage.removeItem('zcanopy_user');
      router.push('/');
    } catch {
      setMessage('Failed to delete account');
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Settings</h2>
        <p className="text-gray-500">Manage your account and preferences.</p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      <Panel title="Profile Information">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </Panel>

      <Panel title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </Panel>

      <Panel title="Notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">New for you</p>
              <p className="text-sm text-gray-500">Receive notifications about new properties</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifications.newForYou}
                onChange={(e) => setNotifications({ ...notifications, newForYou: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[var(--zcanopy-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Account activity</p>
              <p className="text-sm text-gray-500">Receive notifications about account changes</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifications.accountActivity}
                onChange={(e) => setNotifications({ ...notifications, accountActivity: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[var(--zcanopy-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Auto-play videos</p>
              <p className="text-sm text-gray-500">Automatically play videos in property listings</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifications.autoPlay}
                onChange={(e) => setNotifications({ ...notifications, autoPlay: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[var(--zcanopy-primary)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>
      </Panel>

      <Panel title="Account Actions">
        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-red-600 transition-colors hover:bg-red-100"
          >
            Sign Out
          </button>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Delete Account</p>
            <p className="mt-1 text-sm text-red-600">This action cannot be undone. All your data will be permanently removed.</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type 'DELETE' to confirm"
              className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={saving || deleteConfirm !== 'DELETE'}
              className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
