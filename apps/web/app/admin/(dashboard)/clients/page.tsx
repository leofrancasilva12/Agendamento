import { apiFetch, Client } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { createClient, deleteClient } from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default async function ClientsPage() {
  const token = getSessionToken();
  const clients = await apiFetch<Client[]>('/clients', { token });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Novo cliente</h2>
        <form action={createClient} className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Salvar cliente</Button>
          </div>
        </form>
      </Card>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Nome</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-900">{client.name}</td>
                <td>{client.phone}</td>
                <td>{client.email ?? '—'}</td>
                <td className="py-2 text-right">
                  <form action={deleteClient.bind(null, client.id)}>
                    <Button type="submit" variant="danger">
                      Excluir
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <p className="text-sm text-slate-500">Nenhum cliente cadastrado ainda.</p>}
      </Card>
    </div>
  );
}
