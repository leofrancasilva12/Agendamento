import { apiFetch, Company } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { updateCompanySettings } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default async function SettingsPage() {
  const token = getSessionToken();
  const company = await apiFetch<Company>('/companies/me', { token });
  const publicUrl = `${process.env.NEXT_PUBLIC_WEB_URL ?? ''}/${company.slug}`;

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
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
