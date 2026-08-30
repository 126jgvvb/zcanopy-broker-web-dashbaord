"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Briefcase,
  Users,
  Home,
  CalendarCheck,
  Wallet,
  CreditCard,
  Bell,
  HelpCircle,
  Settings,
  Search,
  X,
} from "lucide-react";
import { COLORS } from "@/lib/theme";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: string;
  user: { username: string; email?: string };
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/dashboard/broker", label: "Broker", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/dashboard/customer", label: "Customer", icon: <Users className="h-4 w-4" /> },
];

const BROKER_ITEMS: NavItem[] = [
  { href: "/dashboard/broker", label: "Overview", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/dashboard/broker/properties", label: "Properties", icon: <Home className="h-4 w-4" /> },
  { href: "/dashboard/broker/bookings", label: "Bookings", icon: <CalendarCheck className="h-4 w-4" /> },
  { href: "/dashboard/broker/wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  { href: "/dashboard/broker/subscription", label: "Subscription", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/dashboard/broker/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { href: "/dashboard/broker/help", label: "Help", icon: <HelpCircle className="h-4 w-4" /> },
  { href: "/dashboard/broker/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

const CUSTOMER_ITEMS: NavItem[] = [
  { href: "/dashboard/customer", label: "Overview", icon: <Users className="h-4 w-4" /> },
  { href: "/dashboard/customer/properties", label: "Browse", icon: <Search className="h-4 w-4" /> },
  { href: "/dashboard/customer/bookings", label: "My Bookings", icon: <CalendarCheck className="h-4 w-4" /> },
];

export default function Sidebar({ role, user, onLogout, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isBroker = role === "broker";
  const items = isBroker ? BROKER_ITEMS : CUSTOMER_ITEMS;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200/50 bg-[var(--zcanopy-card-brown)] text-white shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg shadow-lg"
              style={{ backgroundColor: COLORS.accentGold, color: COLORS.cardBrown }}
            >
              Z
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight">ZCanopy</span>
              <span className="block text-[10px] uppercase tracking-widest text-white/60">
                {isBroker ? "Broker" : "Customer"} Console
              </span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== (isBroker ? "/dashboard/broker" : "/dashboard/customer") &&
                pathname.startsWith(item.href));
            return (
            <Link
              key={item.href}
              href={item.href}
              className="hover-gold flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
                style={{
                  backgroundColor: active ? COLORS.accentGold : "transparent",
                  color: active ? COLORS.cardBrown : undefined,
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? "0 4px 6px -1px rgba(0,0,0,0.1)" : undefined,
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-xl bg-white/10 p-3">
            <p className="text-sm font-semibold">{user.username || "User"}</p>
            <p className="text-xs text-white/60 capitalize">{role}</p>
          </div>
          <button
            onClick={() => {
              onLogout();
              router.push("/");
            }}
            className="hover-gold w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/80"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
