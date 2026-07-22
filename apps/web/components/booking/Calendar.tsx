'use client';

import { useState } from 'react';

interface Props {
  value: string | null;
  onChange: (date: string) => void;
  minDate?: string;
}

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function Calendar({ value, onChange, minDate }: Props) {
  const min = minDate ?? toIso(new Date());
  const [cursor, setCursor] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date(`${min}T00:00:00`);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const minMonth = new Date(`${min}T00:00:00`);
  const isAtMinMonth = year === minMonth.getFullYear() && month === minMonth.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function changeMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  function isoFor(day: number) {
    return toIso(new Date(year, month, day));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={isAtMinMonth}
          className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          ← Anterior
        </button>
        <span className="text-sm font-medium text-slate-900">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          Próximo →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAY_SHORT.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const iso = isoFor(day);
          const disabled = iso < min;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`aspect-square rounded-lg text-sm ${
                selected
                  ? 'bg-brand text-white'
                  : disabled
                    ? 'text-slate-300'
                    : 'text-slate-700 hover:bg-brand/10'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
