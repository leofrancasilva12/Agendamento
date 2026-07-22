'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, Professional, Service, formatDuration, formatPrice } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

type Step = 'service' | 'professional' | 'datetime' | 'details' | 'confirmation';

interface Props {
  slug: string;
  services: Service[];
  primaryColor: string;
}

interface ClientForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingWizard({ slug, services }: Props) {
  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<Service | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>({ name: '', phone: '', email: '', notes: '' });
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  async function selectService(selected: Service) {
    setService(selected);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/public/companies/${slug}/services/${selected.id}/professionals`);
      if (!res.ok) throw new Error('Não foi possível carregar os profissionais');
      const data: Professional[] = await res.json();
      setProfessionals(data);
      setStep('professional');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function selectProfessional(selected: Professional) {
    setProfessional(selected);
    setStep('datetime');
  }

  useEffect(() => {
    if (step !== 'datetime' || !service || !professional) return;
    setLoading(true);
    setError(null);
    setTime(null);
    fetch(
      `${API_URL}/public/companies/${slug}/availability?serviceId=${service.id}&professionalId=${professional.id}&date=${date}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar os horários');
        return res.json();
      })
      .then((data: { slots: string[] }) => setSlots(data.slots))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [step, service, professional, date, slug]);

  async function submitBooking() {
    if (!service || !professional || !time) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/public/companies/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          professionalId: professional.id,
          date,
          time,
          client: { name: form.name, phone: form.phone, email: form.email || undefined },
          notes: form.notes || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new ApiError(body.message ?? 'Erro ao criar agendamento', res.status);
      setConfirmedAt(body.startAt);
      setStep('confirmation');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('Esse horário acabou de ser reservado. Escolha outro horário.');
        setStep('datetime');
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = useMemo(
    () => ['service', 'professional', 'datetime', 'details', 'confirmation'].indexOf(step),
    [step],
  );

  return (
    <div className="space-y-6">
      {step !== 'confirmation' && (
        <ol className="flex items-center justify-center gap-2 text-xs text-slate-400">
          {['Serviço', 'Profissional', 'Data/hora', 'Seus dados'].map((label, i) => (
            <li
              key={label}
              className={`rounded-full px-3 py-1 ${i === stepIndex ? 'bg-brand text-white' : 'bg-slate-100'}`}
            >
              {label}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {step === 'service' && (
        <div className="grid gap-3">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => selectService(s)}
              disabled={loading}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand"
            >
              <div>
                <p className="font-medium text-slate-900">{s.name}</p>
                <p className="text-sm text-slate-500">{formatDuration(s.durationMinutes)}</p>
              </div>
              <span className="font-semibold text-brand">{formatPrice(s.priceCents)}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'professional' && (
        <div className="grid gap-3">
          {professionals.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProfessional(p)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand">
                {p.name.charAt(0)}
              </div>
              <p className="font-medium text-slate-900">{p.name}</p>
            </button>
          ))}
          <Button variant="ghost" onClick={() => setStep('service')}>
            ← Voltar
          </Button>
        </div>
      )}

      {step === 'datetime' && (
        <Card>
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            min={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <p className="mb-2 mt-4 text-sm font-medium text-slate-700">Horários disponíveis</p>
          {loading && <p className="text-sm text-slate-500">Carregando...</p>}
          {!loading && slots.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum horário disponível nesta data.</p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s}
                onClick={() => setTime(s)}
                className={`rounded-lg border px-2 py-2 text-sm ${
                  time === s ? 'border-brand bg-brand text-white' : 'border-slate-300 hover:border-brand'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('professional')}>
              ← Voltar
            </Button>
            <Button disabled={!time} onClick={() => setStep('details')}>
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {step === 'details' && (
        <Card>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                required
                placeholder="11999990000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('datetime')}>
              ← Voltar
            </Button>
            <Button
              disabled={loading || !form.name || form.phone.length < 8}
              onClick={submitBooking}
            >
              {loading ? 'Confirmando...' : 'Confirmar agendamento'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'confirmation' && (
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Agendamento confirmado!</h2>
          <p className="mt-2 text-sm text-slate-600">
            {service?.name} com {professional?.name}
            <br />
            {confirmedAt && new Date(confirmedAt).toLocaleString('pt-BR')}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Você receberá uma confirmação por e-mail/WhatsApp.
          </p>
        </Card>
      )}
    </div>
  );
}
