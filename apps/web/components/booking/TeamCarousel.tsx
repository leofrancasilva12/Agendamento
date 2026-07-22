'use client';

import { useState } from 'react';
import { Professional } from '@/lib/api';

export function TeamCarousel({ professionals }: { professionals: Professional[] }) {
  const [index, setIndex] = useState(0);
  if (professionals.length === 0) return null;

  const professional = professionals[index];

  function move(delta: number) {
    setIndex((i) => (i + delta + professionals.length) % professionals.length);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Nossa Equipe</h2>
      <div className="flex items-center justify-center gap-4">
        {professionals.length > 1 && (
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Profissional anterior"
            className="text-2xl text-slate-300 hover:text-brand"
          >
            ‹
          </button>
        )}
        <div>
          {professional.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={professional.avatarUrl}
              alt={professional.name}
              className="mx-auto h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-white">
              {professional.name.charAt(0)}
            </div>
          )}
          <p className="mt-3 font-medium text-slate-900">{professional.name}</p>
        </div>
        {professionals.length > 1 && (
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Próximo profissional"
            className="text-2xl text-slate-300 hover:text-brand"
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
