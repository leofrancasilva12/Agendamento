'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { href: '/admin', label: 'Agenda' },
  { href: '/admin/services', label: 'Serviços' },
  { href: '/admin/professionals', label: 'Profissionais' },
  { href: '/admin/clients', label: 'Clientes' },
  { href: '/admin/settings', label: 'Configurações' },
];

export function AdminNav({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <span className="font-semibold text-slate-900">{companyName}</span>
          <nav className="flex gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button variant="ghost" onClick={logout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
