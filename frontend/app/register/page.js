'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      router.push('/workspace');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-display font-semibold text-xl mb-8">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Brain size={20} className="text-accent" />
          </div>
          DocMind AI
        </Link>

        <div className="card p-8">
          <h1 className="font-display text-2xl font-semibold mb-1">Create your account</h1>
          <p className="text-ink-dim text-sm mb-6">Start indexing and querying your documents</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-ink-dim mb-1.5 block">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Jay"
              />
            </div>
            <div>
              <label className="text-sm text-ink-dim mb-1.5 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-ink-dim mb-1.5 block">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="At least 6 characters"
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <UserPlus size={16} /> {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-dim mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:text-accent-hover">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
