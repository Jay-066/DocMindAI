'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, LogIn, LogOut, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/workspace', label: 'Ask My Docs' },
{ href: '/dashboard', label: 'Evaluation' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: '/admin', label: 'Admin' });
  }

  function handleLogout() {
    logout();
    // Full navigation: protected pages redirect to /login as soon as the user is cleared, and a
    // client-side push('/') would lose that race. A reload also drops any in-memory session data.
    window.location.assign('/');
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

        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-3 py-1">
              <Avatar user={user} />
              <span className="text-sm text-ink max-w-[10rem] truncate">{user.name}</span>
              {user.role === 'admin' && (
                <ShieldCheck size={14} className="text-eval-precision shrink-0" aria-label="Admin" />
              )}
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3" aria-label="Log out">
              <LogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === '/login' ? 'text-ink bg-surface2' : 'text-ink-dim hover:text-ink hover:bg-surface2'
              }`}
            >
              <LogIn size={15} /> Log in
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4 shadow-glow">
              Sign up <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function Avatar({ user }) {
  if (user.avatarUrl) {
    // Google profile photos are served from googleusercontent.com; no-referrer avoids 403s
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />;
  }
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return (
    <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-semibold flex items-center justify-center">
      {initials || '?'}
    </span>
  );
}
