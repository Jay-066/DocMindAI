'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useAuth, getRememberedEmail } from '@/lib/authContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { AuthLayout, TextField, PasswordField, RememberMe } from '@/components/AuthFields';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill the email saved by "Remember me" last time
  useEffect(() => {
    const saved = getRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
      router.push('/workspace');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleGoogle(credential) {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential, remember);
      router.push('/workspace');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to access your workspaces"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent hover:text-accent-hover font-medium">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
        />
        <RememberMe checked={remember} onChange={setRemember} />

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={16} /> {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <GoogleSignInButton text="signin_with" onCredential={handleGoogle} onError={setError} />
    </AuthLayout>
  );
}
