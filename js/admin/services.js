import { supabase } from '/js/supabaseClient.js';
import { el, clear, formatDuration, formatPrice } from '/js/utils.js';
import { requireSession } from './guard.js';
import { renderAdminNav } from './nav.js';

let company, categories, professionals, services;

async function loadData() {
  const { data: cats } = await supabase.from('service_categories').select('*').eq('company_id', company.id).order('order');
  categories = cats || [];

  const { data: profs } = await supabase.from('professionals').select('*').eq('company_id', company.id).order('created_at');
  professionals = profs || [];

  const { data: svcs } = await supabase
    .from('services')
    .select('*, category:service_categories(*), service_professionals(professional_id)')
    .eq('company_id', company.id)
    .order('created_at');
  services = svcs || [];
}

function renderCategories() {
  const container = document.getElementById('categories-list');
  clear(container);
  if (categories.length === 0) {
    container.appendChild(el('p', { class: 'text-sm text-muted' }, 'Nenhuma categoria ainda (ex.: Cabelo, Manicure).'));
    return;
  }
  for (const category of categories) {
    container.appendChild(
      el(
        'button',
        {
          class: 'badge badge-slate',
          style: 'border:none;cursor:pointer;',
          title: 'Clique para excluir',
          onclick: async () => {
            await supabase.from('service_categories').delete().eq('id', category.id);
            await refresh();
          },
        },
        `${category.name} ✕`,
      ),
    );
  }
}

function categorySelect(selectedId) {
  return el('select', { name: 'categoryId' }, [
    el('option', { value: '' }, 'Sem categoria'),
    ...categories.map((c) => el('option', { value: c.id, selected: c.id === selectedId }, c.name)),
  ]);
}

function professionalCheckboxes(selectedIds) {
  if (professionals.length === 0) {
    return el('p', { class: 'text-sm text-muted' }, 'Cadastre um profissional primeiro.');
  }
  return el(
    'div',
    { class: 'row', style: 'flex-wrap:wrap;gap:0.75rem;' },
    professionals.map((p) =>
      el('label', { class: 'row text-sm', style: 'gap:0.4rem;' }, [
        el('input', { type: 'checkbox', name: 'professionalIds', value: p.id, checked: selectedIds.includes(p.id), style: 'width:auto;' }),
        p.name,
      ]),
    ),
  );
}

function buildServiceForm({ service, onSubmit, submitLabel }) {
  const form = el('form', { class: 'stack-sm' });
  const nameInput = el('input', { type: 'text', name: 'name', required: true, value: service?.name ?? '' });
  const priceInput = el('input', { type: 'number', name: 'price', step: '0.01', min: '0', required: true, value: service ? (service.price_cents / 100).toFixed(2) : '' });
  const durationInput = el('input', { type: 'number', name: 'duration', min: '5', required: true, value: service?.duration_minutes ?? '' });
  const descInput = el('input', { type: 'text', name: 'description', value: service?.description ?? '' });
  const imageInput = el('input', { type: 'url', name: 'imageUrl', placeholder: 'https://...', value: service?.image_url ?? '' });
  const categorySel = categorySelect(service?.category_id ?? service?.category?.id);
  const activeCheckbox = service ? el('input', { type: 'checkbox', name: 'active', checked: service.active, style: 'width:auto;' }) : null;
  const selectedProfessionalIds = service ? (service.service_professionals || []).map((sp) => sp.professional_id) : [];

  const fields = [
    el('div', { class: 'field-row' }, [
      el('div', {}, [el('label', {}, 'Nome'), nameInput]),
      el('div', {}, [el('label', {}, 'Categoria'), categorySel]),
    ]),
    el('div', { class: 'field-row' }, [
      el('div', {}, [el('label', {}, 'Preço (R$)'), priceInput]),
      el('div', {}, [el('label', {}, 'Duração (minutos)'), durationInput]),
    ]),
    el('div', {}, [el('label', {}, 'Descrição'), descInput]),
    el('div', {}, [el('label', {}, 'URL da foto (opcional)'), imageInput]),
    activeCheckbox ? el('label', { class: 'row text-sm', style: 'gap:0.4rem;' }, [activeCheckbox, 'Ativo']) : null,
    el('div', {}, [el('p', { class: 'label' }, 'Profissionais'), professionalCheckboxes(selectedProfessionalIds)]),
  ].filter(Boolean);
  form.append(...fields);

  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary' }, submitLabel);
  const actions = el('div', { class: 'row' }, [submitBtn]);
  form.appendChild(actions);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;
    const formData = new FormData(form);
    await onSubmit({
      name: formData.get('name'),
      description: formData.get('description') || null,
      category_id: formData.get('categoryId') || null,
      image_url: formData.get('imageUrl') || null,
      duration_minutes: Number(formData.get('duration')),
      price_cents: Math.round(Number(formData.get('price')) * 100),
      active: activeCheckbox ? activeCheckbox.checked : true,
      professionalIds: formData.getAll('professionalIds'),
    });
    submitBtn.disabled = false;
  });

  return { form, actions };
}

async function saveServiceProfessionals(serviceId, professionalIds) {
  await supabase.from('service_professionals').delete().eq('service_id', serviceId);
  if (professionalIds.length > 0) {
    await supabase.from('service_professionals').insert(professionalIds.map((professionalId) => ({ service_id: serviceId, professional_id: professionalId })));
  }
}

function renderNewServiceForm() {
  const container = document.getElementById('service-form');
  clear(container);
  const { form } = buildServiceForm({
    service: null,
    submitLabel: 'Salvar serviço',
    onSubmit: async (values) => {
      const { professionalIds, ...data } = values;
      const { data: created, error } = await supabase.from('services').insert({ ...data, company_id: company.id }).select().single();
      if (!error) {
        await saveServiceProfessionals(created.id, professionalIds);
        await refresh();
      }
    },
  });
  container.appendChild(form);
}

function renderServicesList() {
  const container = document.getElementById('services-list');
  clear(container);

  for (const service of services) {
    const details = el('details');
    const summary = el('summary', { style: 'cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;' }, [
      el('div', {}, [
        el('p', { class: 'font-medium' }, `${service.name}${!service.active ? ' (inativo)' : ''}`),
        el(
          'p',
          { class: 'text-sm text-muted' },
          `${service.category ? service.category.name + ' · ' : ''}${formatDuration(service.duration_minutes)} · ${formatPrice(service.price_cents)}`,
        ),
      ]),
      el('span', { class: 'text-sm', style: 'color:var(--brand);' }, 'Editar'),
    ]);
    details.appendChild(summary);

    const editWrap = el('div', { class: 'mt-4', style: 'border-top:1px solid var(--slate-100);padding-top:1rem;' });
    const { form } = buildServiceForm({
      service,
      submitLabel: 'Salvar',
      onSubmit: async (values) => {
        const { professionalIds, ...data } = values;
        await supabase.from('services').update(data).eq('id', service.id);
        await saveServiceProfessionals(service.id, professionalIds);
        await refresh();
      },
    });
    editWrap.appendChild(form);
    editWrap.appendChild(
      el(
        'button',
        {
          class: 'btn btn-danger mt-2',
          onclick: async () => {
            await supabase.from('services').delete().eq('id', service.id);
            await refresh();
          },
        },
        'Excluir serviço',
      ),
    );
    details.appendChild(editWrap);

    container.appendChild(el('div', { class: 'card' }, [details]));
  }
}

async function refresh() {
  await loadData();
  renderCategories();
  renderNewServiceForm();
  renderServicesList();
}

async function main() {
  const session = await requireSession();
  if (!session) return;
  company = await renderAdminNav('/admin/services.html');

  document.getElementById('category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('category-name');
    const name = input.value.trim();
    if (!name) return;
    await supabase.from('service_categories').insert({ company_id: company.id, name });
    input.value = '';
    await refresh();
  });

  await refresh();
}

main();
