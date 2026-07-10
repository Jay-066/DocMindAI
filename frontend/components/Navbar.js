'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, LayoutDashboard, MessagesSquare, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/workspace', label: 'Ask My Docs' },
{ href: '/dashboard', label: 'Evaluation' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: '/admin', label: 'Admin' });
  }

  function handleAuthClick() {
    if (user) {
      logout();
      router.push('/');
    } else {
      router.push('/login');
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Brain size={18} className="text-accent" />
          </div>
          DocMind AI
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-ink-dim hover:text-ink hover:bg-surface2'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-ink-faint">
              {user.role === 'admin' && <ShieldCheck size={13} className="text-eval-precision" />}
              {user.name}
            </span>
          )}
          <button onClick={handleAuthClick} className="btn-secondary text-sm py-2 px-4">
            {user ? (
              <>
                <LogOut size={15} /> Logout
              </>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
