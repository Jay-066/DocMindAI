'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileStack, FolderOpen, MessagesSquare, ShieldCheck, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([api.getSystemStats(), api.listUsers()]);
      setStats(statsRes);
      setUsers(usersRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/workspace');
      return;
    }
    if (user?.role === 'admin') loadData();
  }, [user, authLoading, router, loadData]);

  async function handleRoleToggle(u) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    await api.updateUserRole(u.id, newRole);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
  }

  async function handleDeleteUser(id) {
    if (!confirm('Delete this user and all their data?')) return;
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((x) => x.id !== id));
  }

  if (authLoading || !user || user.role !== 'admin' || loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-ink-faint text-sm">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl font-semibold mb-1">Admin Dashboard</h1>
        <p className="text-ink-dim text-sm mb-8">System-wide stats and user management</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users} label="Users" value={stats.userCount} color="#3B82F6" />
          <StatCard icon={FolderOpen} label="Collections" value={stats.collectionCount} color="#A78BFA" />
          <StatCard icon={FileStack} label="Documents" value={stats.documentCount} color="#06B6D4" />
          <StatCard icon={MessagesSquare} label="Conversations" value={stats.conversationCount} color="#22C55E" />
        </div>

        <div className="card p-6 mb-8">
          <p className="eyebrow mb-4">Document Processing Status</p>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(stats.documentStatusBreakdown).map(([status, count]) => (
              <div key={status} className="bg-surface2 rounded-lg p-3 text-center">
                <p className="text-2xl font-display font-semibold">{count}</p>
                <p className="text-xs text-ink-faint capitalize mt-0.5">{status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <p className="eyebrow mb-4">Users</p>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-surface2 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  {u.role === 'admin' && <ShieldCheck size={15} className="text-eval-precision" />}
                  <div>
                    <p className="text-sm text-ink">{u.name}</p>
                    <p className="text-xs text-ink-faint">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRoleToggle(u)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-surface transition-colors text-ink-dim"
                  >
                    {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                  </button>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-ink-faint hover:text-danger transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold">{value}</p>
        <p className="text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  );
}
