'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Turnstile } from '@/components/ui/Turnstile';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await apiFetch<{ role: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, captchaToken }),
      });
      const next = searchParams.get('next');
      if (next) router.push(next);
      else if (user.role === 'CUSTOMER') router.push('/');
      else router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink-100">Sign in</h1>
      <p className="mb-8 text-sm text-ink-400">Access your ElectroHub account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Turnstile onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" disabled={loading || !captchaToken} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        No account yet?{' '}
        <Link href="/register" className="text-volt hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
