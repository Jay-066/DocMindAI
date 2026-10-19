'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken, UNAUTHORIZED_EVENT } from './api';

const AuthContext = createContext(null);

// With "Remember me", the email is kept so the login form can pre-fill it next time.
// Passwords are never stored by the app; the browser's password manager handles those.
const REMEMBERED_EMAIL_KEY = 'docmind_remembered_email';

export function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function startSession(token, user, remember) {
  setToken(token, remember);
  try {
    if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, user.email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // storage unavailable (private mode): the session still works for this page
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await api.me();
      setUser(me);
    } catch (err) {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // api.js already cleared the token; dropping the user makes protected pages redirect to /login
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  async function login(email, password, remember = false) {
    const { token, user: loggedInUser } = await api.login({ email, password, remember });
    startSession(token, loggedInUser, remember);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(name, email, password, remember = false) {
    const { token, user: newUser } = await api.register({ name, email, password, remember });
    startSession(token, newUser, remember);
    setUser(newUser);
    return newUser;
  }

  // credential: the ID token from Google's "Sign in with Google" button
  async function loginWithGoogle(credential, remember = false) {
    const { token, user: googleUser } = await api.googleLogin({ credential, remember });
    startSession(token, googleUser, remember);
    setUser(googleUser);
    return googleUser;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
