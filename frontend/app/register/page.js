'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { AuthLayout, TextField, PasswordField, RememberMe } from '@/components/AuthFields';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, remember);
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
      title="Create your account"
      subtitle="Start indexing and querying your documents"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="name"
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
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
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
        />
        <RememberMe checked={remember} onChange={setRemember} />

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <UserPlus size={16} /> {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <GoogleSignInButton text="signup_with" onCredential={handleGoogle} onError={setError} />
    </AuthLayout>
  );
}
