'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Eye, EyeOff, ChevronLeft, Minus, X, Maximize2 } from 'lucide-react';
import LandingPage from '@/app/page';

/**
 * Login / sign-up shown as a sheet over the home page. The bar on top has an iOS-style
 * "‹ Home" back button plus minimise and close. Minimise tucks the form into a pill so the
 * home page can be browsed, keeping anything already typed; Escape minimises too.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  const router = useRouter();
  const [minimised, setMinimised] = useState(false);
  const homeRef = useRef(null);

  useEffect(() => {
    // The home page behind the sheet can't be focused or clicked while the sheet is open
    if (homeRef.current) homeRef.current.inert = !minimised;
    if (minimised) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setMinimised(true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [minimised]);

  // While minimised, a link to this same page (navbar "Log in", hero "Get started") would be a
  // no-op navigation, so treat it as "reopen the sheet" instead
  useEffect(() => {
    if (!minimised) return undefined;
    const onClick = (e) => {
      const link = e.target.closest?.('a[href]');
      if (link && new URL(link.href).pathname === window.location.pathname) {
        e.preventDefault();
        setMinimised(false);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [minimised]);

  const goHome = () => router.push('/');

  return (
    <div className="relative min-h-screen bg-base">
      <div ref={homeRef} aria-hidden={!minimised}>
        <LandingPage />
      </div>

      {/* Kept mounted while minimised so typed values and the Google button survive */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className={`fixed inset-0 z-50 overflow-y-auto bg-base/70 backdrop-blur-sm ${minimised ? 'hidden' : ''}`}
      >
        <div className="min-h-full flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm card shadow-glow overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-border bg-surface2/40">
              <button
                type="button"
                onClick={goHome}
                className="flex items-center text-accent hover:text-accent-hover text-[15px] font-medium pr-2 py-1 rounded-md transition-colors"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
                Home
              </button>
              <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-ink-dim">
                <Brain size={14} className="text-accent" /> DocMind AI
              </span>
              <div className="flex items-center gap-1.5 pr-1">
                <button
                  type="button"
                  onClick={() => setMinimised(true)}
                  aria-label="Minimise"
                  title="Minimise"
                  className="w-7 h-7 rounded-full bg-surface2 text-ink-dim hover:text-ink hover:bg-border flex items-center justify-center transition-colors"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  onClick={goHome}
                  aria-label="Close and go to the home page"
                  title="Close"
                  className="w-7 h-7 rounded-full bg-surface2 text-ink-dim hover:text-danger hover:bg-danger/15 flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-8 pt-6">
              <h1 id="auth-title" className="font-display text-2xl font-semibold mb-1">
                {title}
              </h1>
              <p className="text-ink-dim text-sm mb-6">{subtitle}</p>
              {children}
              <p className="text-center text-sm text-ink-dim mt-6">{footer}</p>
            </div>
          </div>
        </div>
      </div>

      {minimised && (
        <button
          type="button"
          onClick={() => setMinimised(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-accent/40 bg-surface pl-2 pr-4 py-2 shadow-glow animate-slideUp hover:border-accent transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
            <Brain size={17} className="text-accent" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-ink">{title}</span>
            <span className="block text-[11px] text-ink-faint">Tap to continue</span>
          </span>
          <Maximize2 size={14} className="text-ink-faint ml-1" />
        </button>
      )}
    </div>
  );
}

export function TextField({ id, label, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-ink-dim mb-1.5 block">
        {label}
      </label>
      <input id={id} required className="input-field" {...inputProps} />
    </div>
  );
}

/** Password input with a show/hide toggle. Pass autoComplete so password managers can save it. */
export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm text-ink-dim mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pr-11"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-faint hover:text-ink transition-colors"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function RememberMe({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded accent-accent cursor-pointer"
      />
      <span>
        <span className="block text-sm text-ink">Remember me</span>
        <span className="block text-xs text-ink-faint">Stay signed in on this device and remember my email</span>
      </span>
    </label>
  );
}
