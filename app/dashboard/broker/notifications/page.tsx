'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';
import {
  Calendar,
  DollarSign,
  Upload,
  Trash2,
  Pencil,
  Settings,
  Bell,
  BellRing,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function BrokerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;

    webApi.brokerNotifications(token)
      .then((data: any) => {
        const items = (data.notifications || []).map((n: any) => ({
          id: n.id || n.notificationId || Math.random().toString(),
          type: n.type || n.channel || 'system',
          title: n.title || n.message || 'Notification',
          message: n.message || n.title || '',
          time: n.createdAt || n.time || '',
          read: n.read || false,
        }));
        setNotifications(items);
      })
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
    setMarkingRead(true);
    try {
      await webApi.brokerMarkNotificationsRead(token, { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingRead(false);
    }
  };

  const markAsRead = async (id: string) => {
    const token = localStorage.getItem('zcanopy_token');
    if (!token) return;
    try {
      await webApi.brokerMarkNotificationsRead(token, { id });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <LoadingState label="Loading notifications" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Notifications</h2>
          <p className="text-gray-500">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingRead}
            className="rounded-xl bg-[var(--zcanopy-primary)] px-4 py-2 text-sm text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
          >
            {markingRead ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'booking', 'payment', 'propertyRemoved', 'propertyUpload', 'system', 'fcm'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? 'bg-[var(--zcanopy-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('propertyRemoved', 'Removed').replace('propertyUpload', 'Uploads').replace('fcm', 'Push')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400">No notifications found.</p>
          </div>
        )}
        {filtered.map((notification) => (
          <div
            key={notification.id}
            onClick={() => !notification.read && markAsRead(notification.id)}
            className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
              notification.read ? 'border-gray-100 bg-white' : 'border-[var(--zcanopy-primary)] bg-orange-50/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--zcanopy-card-brown)]">{notification.title}</h3>
                  {!notification.read && <span className="h-2 w-2 rounded-full bg-[var(--zcanopy-primary)]" />}
                </div>
                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                <p className="mt-2 text-xs text-gray-400">{notification.time ? new Date(notification.time).toLocaleString() : ''}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'booking':
      return <Calendar className="h-5 w-5 text-gray-500" />;
    case 'payment':
    case 'transaction':
      return <DollarSign className="h-5 w-5 text-gray-500" />;
    case 'propertyUpload':
      return <Upload className="h-5 w-5 text-gray-500" />;
    case 'propertyRemoved':
      return <Trash2 className="h-5 w-5 text-gray-500" />;
    case 'propertyUpdated':
      return <Pencil className="h-5 w-5 text-gray-500" />;
    case 'system':
      return <Settings className="h-5 w-5 text-gray-500" />;
    case 'fcm':
      return <Bell className="h-5 w-5 text-gray-500" />;
    default:
      return <BellRing className="h-5 w-5 text-gray-500" />;
  }
}
