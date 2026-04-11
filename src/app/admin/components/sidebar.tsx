'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Shield,
  Cog,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/scrapers', label: 'Scrapers', icon: Cog },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function AdminSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const nav = (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-jet/10">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-signal flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </span>
          <span className="font-display font-semibold text-lg text-jet tracking-tight">
            Admin
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors ${
              isActive(href)
                ? 'bg-signal/10 text-signal font-medium'
                : 'text-jet/60 hover:bg-jet/5 hover:text-jet'
            }`}
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-jet/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          {user.image ? (
            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-jet/10 flex items-center justify-center text-xs font-medium text-jet">
              {user.name?.[0] || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-body font-medium text-jet truncate">{user.name}</p>
            <p className="text-xs font-body text-jet/50 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm font-body text-jet/60 hover:bg-jet/5 hover:text-jet transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-sm border border-jet/10 cursor-pointer"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-jet/10 flex flex-col transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
