'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import ZLoadingIndicator from '@/components/ZLoadingIndicator';
import { Menu } from 'lucide-react';
import { COLORS } from '@/lib/theme';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('zcanopy_token');
    const storedRole = localStorage.getItem('zcanopy_role');
    const storedUser = localStorage.getItem('zcanopy_user');

    if (!token || !storedRole) {
      setLoading(false);
      return;
    }

    setRole(storedRole);
    setUser(storedUser ? JSON.parse(storedUser) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  const logout = () => {
    localStorage.removeItem('zcanopy_token');
    localStorage.removeItem('zcanopy_role');
    localStorage.removeItem('zcanopy_user');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <ZLoadingIndicator size={72} color={COLORS.primary} label="Loading console" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar role={role} user={user} onLogout={logout} isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="flex items-center justify-between border-b border-gray-200/60 bg-[var(--zcanopy-surface)]/80 px-8 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Menu className="h-5 w-5" />
              </button>
            <h1 className="text-xl font-bold text-[var(--zcanopy-card-brown)]">ZCanopy</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.username || user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{role}</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white shadow-md"
              style={{ backgroundColor: COLORS.primary }}
            >
              {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
