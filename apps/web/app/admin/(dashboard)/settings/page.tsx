import { apiFetch, Company, WEEKDAY_LABELS } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { updateCompanySettings, updateCompanyHours } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default async function SettingsPage() {
  const token = getSessionToken();
  const company = await apiFetch<Company>('/companies/me', { token });
  const hoursByWeekday = new Map((company.hours ?? []).map((h) => [h.weekday, h]));

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Página pública de agendamento</h2>
        <p className="mb-4 text-sm text-slate-500">Compartilhe este link com seus clientes:</p>
        <code className="block rounded-lg bg-slate-100 px-3 py-2 text-sm">/{company.slug}</code>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Dados da empresa</h2>
        <form action={updateCompanySettings} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={company.name} required />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={company.phone ?? ''} />
          </div>
          <div>
            <Label htmlFor="primaryColor">Cor principal</Label>
            <Input id="primaryColor" name="primaryColor" type="color" defaultValue={company.primaryColor} />
          </div>
          <div>
            <Label htmlFor="timezone">Fuso horário</Label>
            <Input id="timezone" name="timezone" defaultValue={company.timezone} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="addressLine">Endereço</Label>
            <Input
              id="addressLine"
              name="addressLine"
              placeholder="Rua, número - Bairro - Cidade - UF - CEP"
              defaultValue={company.addressLine ?? ''}
            />
          </div>
          <div>
            <Label htmlFor="instagramUrl">Instagram (URL)</Label>
            <Input id="instagramUrl" name="instagramUrl" type="url" defaultValue={company.instagramUrl ?? ''} />
          </div>
          <div>
            <Label htmlFor="facebookUrl">Facebook (URL)</Label>
            <Input id="facebookUrl" name="facebookUrl" type="url" defaultValue={company.facebookUrl ?? ''} />
          </div>
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp (só números, com DDD)</Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              placeholder="11999990000"
              defaultValue={company.whatsappNumber ?? ''}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Horários de funcionamento</h2>
        <p className="mb-4 text-sm text-slate-500">
          Exibidos na página pública. Não interferem na disponibilidade de agendamento, que segue os
          horários de cada profissional.
        </p>
        <form action={updateCompanyHours} className="space-y-3">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const day = hoursByWeekday.get(weekday);
            return (
              <div key={weekday} className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3">
                <span className="w-32 text-sm font-medium">{label}</span>
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input type="checkbox" name={`closed-${weekday}`} defaultChecked={day?.closed ?? weekday === 0} />
                  Fechado
                </label>
                <input
                  type="time"
                  name={`start-${weekday}`}
                  defaultValue={day?.startTime ?? '09:00'}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="time"
                  name={`end-${weekday}`}
                  defaultValue={day?.endTime ?? '18:00'}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
            );
          })}
          <Button type="submit">Salvar horários</Button>
        </form>
      </Card>
    </div>
  );
}
