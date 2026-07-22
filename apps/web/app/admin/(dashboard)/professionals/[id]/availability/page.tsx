import { apiFetch, Professional } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { setAvailability } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface AvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

export default async function AvailabilityPage({ params }: { params: { id: string } }) {
  const token = getSessionToken();
  const [professional, availability] = await Promise.all([
    apiFetch<Professional>(`/professionals/${params.id}`, { token }),
    apiFetch<AvailabilitySlot[]>(`/professionals/${params.id}/availability`, { token }),
  ]);

  const byWeekday = new Map(availability.map((slot) => [slot.weekday, slot]));

  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Horários de {professional.name}</h2>
      <p className="mb-4 text-sm text-slate-500">Defina os dias e horários em que este profissional atende.</p>

      <form action={setAvailability.bind(null, params.id)} className="space-y-3">
        {WEEKDAYS.map((label, weekday) => {
          const slot = byWeekday.get(weekday);
          return (
            <div key={weekday} className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input type="checkbox" name={`active-${weekday}`} defaultChecked={Boolean(slot)} />
                {label}
              </label>
              <input
                type="time"
                name={`start-${weekday}`}
                defaultValue={slot?.startTime ?? '09:00'}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <span className="text-slate-400">até</span>
              <input
                type="time"
                name={`end-${weekday}`}
                defaultValue={slot?.endTime ?? '18:00'}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          );
        })}
        <Button type="submit">Salvar horários</Button>
      </form>
    </Card>
  );
}
