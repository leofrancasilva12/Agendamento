import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand">
        Agenda online para o seu negócio
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Deixe seus clientes agendarem sozinhos, a qualquer hora
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Crie sua página de agendamento, cadastre serviços e profissionais, e gerencie sua agenda em
        um painel simples. Confirmações e lembretes automáticos por e-mail e WhatsApp.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/admin/login">
          <Button className="px-6 py-3 text-base">Entrar no painel</Button>
        </Link>
        <Link href="/salao-exemplo">
          <Button variant="secondary" className="px-6 py-3 text-base">
            Ver página de agendamento (exemplo)
          </Button>
        </Link>
      </div>
    </main>
  );
}
