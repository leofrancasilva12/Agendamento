import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agendamento — Agenda online para o seu negócio',
  description: 'Sistema de agendamento online multiempresa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
