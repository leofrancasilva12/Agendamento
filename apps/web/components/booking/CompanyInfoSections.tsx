import { Company, WEEKDAY_LABELS } from '@/lib/api';

export function LocationSection({ addressLine }: { addressLine?: string | null }) {
  if (!addressLine) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">📍 Localização</h2>
      <p className="mb-3 text-sm text-slate-600">{addressLine}</p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-brand hover:underline"
      >
        Abrir no Maps ↗
      </a>
    </section>
  );
}

export function HoursSection({ hours }: { hours?: Company['hours'] }) {
  if (!hours || hours.length === 0) return null;
  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">🕐 Horários</h2>
      <ul className="divide-y divide-slate-100 text-sm">
        {sorted.map((day) => (
          <li key={day.weekday} className="flex items-center justify-between py-2">
            <span className="text-slate-700">{WEEKDAY_LABELS[day.weekday]}</span>
            <span className={day.closed ? 'text-slate-400' : 'font-medium text-slate-900'}>
              {day.closed ? 'Fechado' : `${day.startTime} - ${day.endTime}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SocialSection({
  instagramUrl,
  facebookUrl,
  whatsappNumber,
}: {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsappNumber?: string | null;
}) {
  if (!instagramUrl && !facebookUrl && !whatsappNumber) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Redes Sociais</h2>
      <div className="flex items-center justify-center gap-4">
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white"
          >
            IG
          </a>
        )}
        {facebookUrl && (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white"
          >
            FB
          </a>
        )}
        {whatsappNumber && (
          <a
            href={`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white"
          >
            WA
          </a>
        )}
      </div>
    </section>
  );
}
