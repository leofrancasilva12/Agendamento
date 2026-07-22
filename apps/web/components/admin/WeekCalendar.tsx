'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, formatPrice } from '@/lib/api';
import { updateBookingStatus } from '@/lib/actions';
import { Button } from '@/components/ui/Button';

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 15;
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const ROW_HEIGHT = 16; // px per 15-minute slot
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-orange-100 text-orange-800 border-orange-300',
];

const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
};

function colorForProfessional(id: string) {
  // djb2 hash — evita colisões triviais entre ids parecidos (cuids).
  let hash = 5381;
  for (const ch of id) hash = (hash * 33) ^ ch.charCodeAt(0);
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

function toSlot(date: Date) {
  const minutes = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
  return Math.min(Math.max(minutes / SLOT_MINUTES, 0), SLOTS_PER_DAY);
}

interface DayBooking extends Booking {
  lane: number;
  lanes: number;
}

function layoutDay(bookings: Booking[]): DayBooking[] {
  const sorted = [...bookings].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const laneEnds: string[] = [];
  const placed = sorted.map((booking) => {
    let lane = laneEnds.findIndex((end) => end <= booking.startAt);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(booking.endAt);
    } else {
      laneEnds[lane] = booking.endAt;
    }
    return { ...booking, lane, lanes: 1 };
  });
  const totalLanes = Math.max(1, laneEnds.length);
  return placed.map((b) => ({ ...b, lanes: totalLanes }));
}

export function WeekCalendar({ days, bookings }: { days: string[]; bookings: Booking[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [pending, setPending] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const day of days) map.set(day, []);
    for (const booking of bookings) {
      const day = booking.startAt.slice(0, 10);
      if (map.has(day)) map.get(day)!.push(booking);
    }
    return new Map(days.map((day) => [day, layoutDay(map.get(day) ?? [])]));
  }, [days, bookings]);

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const todayIso = new Date().toISOString().slice(0, 10);

  async function handleStatus(id: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
    setPending(true);
    await updateBookingStatus(id, status);
    setPending(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="relative">
      <div className="flex">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const date = new Date(`${day}T00:00:00`);
          const isToday = day === todayIso;
          return (
            <div key={day} className="flex-1 text-center">
              <p className="text-xs text-slate-400">{DAY_LABELS[date.getDay()]}</p>
              <p
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  isToday ? 'bg-brand text-white' : 'text-slate-700'
                }`}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex border-t border-slate-200">
        <div className="w-14 shrink-0">
          {hourMarks.map((hour) => (
            <div key={hour} style={{ height: ROW_HEIGHT * 4 }} className="-mt-2 text-right text-xs text-slate-400">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7">
          {days.map((day) => (
            <div
              key={day}
              className="relative border-l border-slate-100"
              style={{ height: ROW_HEIGHT * SLOTS_PER_DAY }}
            >
              {hourMarks.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-slate-100"
                  style={{ top: i * ROW_HEIGHT * 4 }}
                />
              ))}

              {(byDay.get(day) ?? []).map((booking) => {
                const start = toSlot(new Date(booking.startAt));
                const end = toSlot(new Date(booking.endAt));
                const width = 100 / booking.lanes;
                const isCanceled = booking.status === 'CANCELED';
                return (
                  <button
                    key={booking.id}
                    onClick={() => setSelected(booking)}
                    className={`absolute overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm ${colorForProfessional(
                      booking.professional.id,
                    )} ${isCanceled ? 'opacity-40 line-through' : ''}`}
                    style={{
                      top: start * ROW_HEIGHT,
                      height: Math.max((end - start) * ROW_HEIGHT, ROW_HEIGHT),
                      left: `${booking.lane * width}%`,
                      width: `${width}%`,
                    }}
                  >
                    <span className="block truncate font-medium">{booking.service.name}</span>
                    <span className="block truncate">{booking.client.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{selected.service.name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(selected.startAt).toLocaleString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Cliente</dt>
                <dd className="font-medium text-slate-900">{selected.client.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Telefone</dt>
                <dd className="font-medium text-slate-900">{selected.client.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Profissional</dt>
                <dd className="font-medium text-slate-900">{selected.professional.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Valor</dt>
                <dd className="font-medium text-slate-900">{formatPrice(selected.service.priceCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-900">{STATUS_LABEL[selected.status]}</dd>
              </div>
              {selected.notes && (
                <div>
                  <dt className="text-slate-500">Observações</dt>
                  <dd className="mt-1 text-slate-700">{selected.notes}</dd>
                </div>
              )}
            </dl>

            {(selected.status === 'PENDING' || selected.status === 'CONFIRMED') && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === 'PENDING' && (
                  <Button disabled={pending} onClick={() => handleStatus(selected.id, 'CONFIRMED')}>
                    Confirmar
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => handleStatus(selected.id, 'COMPLETED')}
                >
                  Concluir
                </Button>
                <Button variant="danger" disabled={pending} onClick={() => handleStatus(selected.id, 'CANCELED')}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
