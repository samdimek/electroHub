'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Turnstile } from '@/components/ui/Turnstile';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ ...form, captchaToken }) });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink-100">Create your account</h1>
      <p className="mb-8 text-sm text-ink-400">Shop electronics from vetted vendors.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input
          label="Password"
          type="password"
          required
          minLength={10}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <p className="text-xs text-ink-400">At least 10 characters, mixing upper/lowercase, numbers, and symbols.</p>
        <Turnstile onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <Button type="submit" disabled={loading || !captchaToken} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{' '}
        <Link href="/login" className="text-volt hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
