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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)]/75 px-6 py-3.5 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] text-[var(--zcanopy-card-brown)] transition-colors hover:border-[var(--zcanopy-accent-gold)]"
              >
                <Menu className="h-5 w-5" />
              </button>
            <h1 className="text-2xl text-[var(--zcanopy-card-brown)]">ZCanopy</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.username || user?.email}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--zcanopy-muted)]">{role}</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-[family-name:var(--font-cormorant)] text-lg font-semibold text-white ring-2 ring-[var(--zcanopy-accent-gold)]/40"
              style={{ backgroundColor: COLORS.primary }}
            >
              {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="zc-page flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
