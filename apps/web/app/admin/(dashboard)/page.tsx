import { apiFetch, Booking, formatPrice } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { updateBookingStatus } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
};

const STATUS_COLOR: Record<Booking['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CANCELED: 'bg-slate-200 text-slate-500',
  COMPLETED: 'bg-green-100 text-green-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const token = getSessionToken();
  const date = searchParams.date ?? todayIso();

  const [bookings, summary] = await Promise.all([
    apiFetch<Booking[]>(`/bookings?date=${date}`, { token }),
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Agenda</h2>
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <Button type="submit" variant="secondary">
              Ver
            </Button>
          </form>
        </div>

        {bookings.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum agendamento para esta data.</p>
        )}

        <ul className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">
                  {new Date(booking.startAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  — {booking.service.name}
                </p>
                <p className="text-sm text-slate-500">
                  {booking.client.name} · {booking.professional.name} ·{' '}
                  {formatPrice(booking.service.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[booking.status]}`}>
                  {STATUS_LABEL[booking.status]}
                </span>
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                  <>
                    {booking.status === 'PENDING' && (
                      <form action={updateBookingStatus.bind(null, booking.id, 'CONFIRMED')}>
                        <Button variant="secondary" type="submit">
                          Confirmar
                        </Button>
                      </form>
                    )}
                    <form action={updateBookingStatus.bind(null, booking.id, 'COMPLETED')}>
                      <Button variant="secondary" type="submit">
                        Concluir
                      </Button>
                    </form>
                    <form action={updateBookingStatus.bind(null, booking.id, 'CANCELED')}>
                      <Button variant="danger" type="submit">
                        Cancelar
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
