import Link from 'next/link';
import { apiFetch, Professional } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { createProfessional, deleteProfessional, updateProfessional } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default async function ProfessionalsPage() {
  const token = getSessionToken();
  const professionals = await apiFetch<Professional[]>('/professionals', { token });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Novo profissional</h2>
        <form action={createProfessional} className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Salvar profissional</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {professionals.map((professional) => (
          <Card key={professional.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {professional.name}{' '}
                    {!professional.active && <span className="text-xs text-slate-400">(inativo)</span>}
                  </p>
                  <p className="text-sm text-slate-500">{professional.email ?? professional.phone ?? '—'}</p>
                </div>
                <span className="text-sm text-brand">Editar</span>
              </summary>

              <form
                action={updateProfessional.bind(null, professional.id)}
                className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3"
              >
                <div>
                  <Label htmlFor={`name-${professional.id}`}>Nome</Label>
                  <Input id={`name-${professional.id}`} name="name" defaultValue={professional.name} required />
                </div>
                <div>
                  <Label htmlFor={`email-${professional.id}`}>E-mail</Label>
                  <Input
                    id={`email-${professional.id}`}
                    name="email"
                    type="email"
                    defaultValue={professional.email ?? ''}
                  />
                </div>
                <div>
                  <Label htmlFor={`phone-${professional.id}`}>Telefone</Label>
                  <Input id={`phone-${professional.id}`} name="phone" defaultValue={professional.phone ?? ''} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={professional.active} /> Ativo
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-3">
                  <Button type="submit">Salvar</Button>
                  <Link href={`/admin/professionals/${professional.id}/availability`}>
                    <Button type="button" variant="secondary">
                      Definir horários
                    </Button>
                  </Link>
                </div>
              </form>
              <form action={deleteProfessional.bind(null, professional.id)} className="mt-2">
                <Button type="submit" variant="danger">
                  Excluir profissional
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
