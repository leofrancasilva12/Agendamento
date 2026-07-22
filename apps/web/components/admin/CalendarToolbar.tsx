'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Professional } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Props {
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  todayWeek: string;
  rangeLabel: string;
  professionals: Professional[];
  professionalId?: string;
}

export function CalendarToolbar({
  weekStart,
  prevWeek,
  nextWeek,
  todayWeek,
  rangeLabel,
  professionals,
  professionalId,
}: Props) {
  const router = useRouter();

  function query(week: string, prof?: string) {
    const params = new URLSearchParams({ week });
    if (prof) params.set('professionalId', prof);
    return `/admin?${params.toString()}`;
  }

  function onProfessionalChange(value: string) {
    router.push(query(weekStart, value || undefined));
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link href={query(prevWeek, professionalId)}>
          <Button variant="secondary">←</Button>
        </Link>
        <Link href={query(todayWeek, professionalId)}>
          <Button variant="secondary">Hoje</Button>
        </Link>
        <Link href={query(nextWeek, professionalId)}>
          <Button variant="secondary">→</Button>
        </Link>
        <span className="ml-2 text-sm font-medium text-slate-700">{rangeLabel}</span>
      </div>

      <select
        value={professionalId ?? ''}
        onChange={(e) => onProfessionalChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">Todos os profissionais</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
