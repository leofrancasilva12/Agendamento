'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? 'Não foi possível entrar');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Entrar</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Não tem conta?{' '}
        <a href="/admin/register" className="font-medium text-brand">
          Criar empresa
        </a>
      </p>
    </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '',
    slug: '',
    ownerName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? 'Não foi possível criar a conta');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Criar sua empresa</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <Label htmlFor="companyName">Nome do negócio</Label>
          <Input
            id="companyName"
            required
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="slug">Endereço da página (slug)</Label>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <span>/</span>
            <Input
              id="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="minha-empresa"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ownerName">Seu nome</Label>
          <Input
            id="ownerName"
            required
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Criando...' : 'Criar empresa'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <a href="/admin/login" className="font-medium text-brand">
          Entrar
        </a>
      </p>
    </Card>
  );
}
