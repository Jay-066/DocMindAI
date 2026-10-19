'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisLoading = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        gisLoading = null;
        reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

/**
 * Google's official "Sign in with Google" button (Google Identity Services), preceded by an
 * "or" divider. Renders nothing unless the backend reports a GOOGLE_CLIENT_ID.
 * onCredential receives the Google ID token, to be verified by POST /api/auth/google.
 * text: 'signin_with' | 'signup_with' | 'continue_with'
 */
export default function GoogleSignInButton({ text = 'continue_with', onCredential, onError }) {
  const containerRef = useRef(null);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    api
      .getAuthConfig()
      .then(({ googleClientId }) => setClientId(googleClientId))
      .catch(() => setClientId(null));
  }, []);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => handlers.current.onCredential?.(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width: Math.max(200, Math.min(400, containerRef.current.offsetWidth)),
        });
      })
      .catch((err) => handlers.current.onError?.(err.message));
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <>
      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-faint">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={containerRef} className="w-full min-h-[44px] flex justify-center" />
    </>
  );
}
