'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'PROFESSOR'>('STUDENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      router.push(role === 'PROFESSOR' ? '/professor' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <KeyRound className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Syllabus <span className="text-indigo-400">Navigator</span>
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Curriculum intelligence that prepares you for what&apos;s next
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                    role === 'STUDENT'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                      : 'bg-gray-900 border-gray-700 text-zinc-400 hover:border-gray-600'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('PROFESSOR')}
                  className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                    role === 'PROFESSOR'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                      : 'bg-gray-900 border-gray-700 text-zinc-400 hover:border-gray-600'
                  }`}
                >
                  Professor
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-700">
            <p className="text-xs text-zinc-500 text-center">
              Demo: student@edu.com / student123 &mdash; professor@edu.com / prof123
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
