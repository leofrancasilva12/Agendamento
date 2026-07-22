import { apiFetch, Professional, Service, ServiceCategory, formatDuration, formatPrice } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  updateService,
} from '@/lib/actions';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type ServiceWithProfessionals = Service & {
  professionals: { professional: Professional }[];
};

export default async function ServicesPage() {
  const token = getSessionToken();
  const [services, professionals, categories] = await Promise.all([
    apiFetch<ServiceWithProfessionals[]>('/services', { token }),
    apiFetch<Professional[]>('/professionals', { token }),
    apiFetch<ServiceCategory[]>('/service-categories', { token }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Categorias</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <form key={category.id} action={deleteCategory.bind(null, category.id)}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                title="Clique para excluir"
              >
                {category.name} ✕
              </button>
            </form>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma categoria ainda (ex.: Cabelo, Manicure).</p>
          )}
        </div>
        <form action={createCategory} className="flex gap-2">
          <Input name="name" placeholder="Nome da categoria" required />
          <Button type="submit" variant="secondary">
            Adicionar
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Novo serviço</h2>
        <form action={createService} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="categoryId">Categoria</Label>
            <select
              id="categoryId"
              name="categoryId"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" required />
          </div>
          <div>
            <Label htmlFor="durationMinutes">Duração (minutos)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" min="5" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="imageUrl">URL da foto (opcional)</Label>
            <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://..." />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Profissionais</legend>
            <div className="flex flex-wrap gap-3">
              {professionals.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="professionalIds" value={p.id} /> {p.name}
                </label>
              ))}
              {professionals.length === 0 && (
                <p className="text-sm text-slate-500">Cadastre um profissional primeiro.</p>
              )}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <Button type="submit">Salvar serviço</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card key={service.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {service.name} {!service.active && <span className="text-xs text-slate-400">(inativo)</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {service.category ? `${service.category.name} · ` : ''}
                    {formatDuration(service.durationMinutes)} · {formatPrice(service.priceCents)}
                  </p>
                </div>
                <span className="text-sm text-brand">Editar</span>
              </summary>

              <form action={updateService.bind(null, service.id)} className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`name-${service.id}`}>Nome</Label>
                  <Input id={`name-${service.id}`} name="name" defaultValue={service.name} required />
                </div>
                <div>
                  <Label htmlFor={`categoryId-${service.id}`}>Categoria</Label>
                  <select
                    id={`categoryId-${service.id}`}
                    name="categoryId"
                    defaultValue={service.categoryId ?? service.category?.id ?? ''}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`price-${service.id}`}>Preço (R$)</Label>
                  <Input
                    id={`price-${service.id}`}
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={(service.priceCents / 100).toFixed(2)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`duration-${service.id}`}>Duração (minutos)</Label>
                  <Input
                    id={`duration-${service.id}`}
                    name="durationMinutes"
                    type="number"
                    min="5"
                    defaultValue={service.durationMinutes}
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={service.active} /> Ativo
                </label>
                <div className="sm:col-span-2">
                  <Label htmlFor={`description-${service.id}`}>Descrição</Label>
                  <Input
                    id={`description-${service.id}`}
                    name="description"
                    defaultValue={service.description ?? ''}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`imageUrl-${service.id}`}>URL da foto</Label>
                  <Input
                    id={`imageUrl-${service.id}`}
                    name="imageUrl"
                    type="url"
                    defaultValue={service.imageUrl ?? ''}
                  />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium text-slate-700">Profissionais</legend>
                  <div className="flex flex-wrap gap-3">
                    {professionals.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="professionalIds"
                          value={p.id}
                          defaultChecked={service.professionals.some((sp) => sp.professional.id === p.id)}
                        />{' '}
                        {p.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
              <form action={deleteService.bind(null, service.id)} className="mt-2">
                <Button type="submit" variant="danger">
                  Excluir serviço
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
