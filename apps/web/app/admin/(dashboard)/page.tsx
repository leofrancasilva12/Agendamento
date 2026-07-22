import { apiFetch, Booking, Professional } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { Card } from '@/components/ui/Card';
import { WeekCalendar } from '@/components/admin/WeekCalendar';
import { CalendarToolbar } from '@/components/admin/CalendarToolbar';

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sundayOf(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function formatRange(start: string, end: string) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: withYear ? 'numeric' : undefined });
  return `${fmt(s, false)} – ${fmt(e, true)}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { week?: string; professionalId?: string };
}) {
  const token = getSessionToken();
  const todayWeek = toIso(sundayOf(new Date()));
  const weekStart = searchParams.week ? toIso(sundayOf(new Date(`${searchParams.week}T00:00:00`))) : todayWeek;
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const professionalId = searchParams.professionalId;

  const bookingsQuery = new URLSearchParams({ from: weekStart, to: weekEnd });
  if (professionalId) bookingsQuery.set('professionalId', professionalId);

  const [bookings, professionals, summary] = await Promise.all([
    apiFetch<Booking[]>(`/bookings?${bookingsQuery.toString()}`, { token }),
    apiFetch<Professional[]>('/professionals', { token }),
    apiFetch<{
      todayCount: number;
      activeServices: number;
      activeProfessionals: number;
      totalClients: number;
    }>('/dashboard/summary', { token }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Hoje</p>
          <p className="text-2xl font-semibold">{summary.todayCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Serviços ativos</p>
          <p className="text-2xl font-semibold">{summary.activeServices}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Profissionais ativos</p>
          <p className="text-2xl font-semibold">{summary.activeProfessionals}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Clientes</p>
          <p className="text-2xl font-semibold">{summary.totalClients}</p>
        </Card>
      </div>

      <Card>
        <CalendarToolbar
          weekStart={weekStart}
          prevWeek={addDays(weekStart, -7)}
          nextWeek={addDays(weekStart, 7)}
          todayWeek={todayWeek}
          rangeLabel={formatRange(weekStart, weekEnd)}
          professionals={professionals}
          professionalId={professionalId}
        />
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <WeekCalendar days={days} bookings={bookings} />
          </div>
        </div>
      </Card>
    </div>
  );
}
