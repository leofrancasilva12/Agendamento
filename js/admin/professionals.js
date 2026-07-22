import { supabase } from '/js/supabaseClient.js';
import { el, clear } from '/js/utils.js';
import { requireSession } from './guard.js';
import { renderAdminNav } from './nav.js';

let company;

async function loadProfessionals() {
  const { data } = await supabase.from('professionals').select('*').eq('company_id', company.id).order('created_at');
  return data || [];
}

function renderList(professionals) {
  const container = document.getElementById('professionals-list');
  clear(container);

  for (const professional of professionals) {
    const details = el('details');
    details.appendChild(
      el('summary', { style: 'cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;' }, [
        el('div', {}, [
          el('p', { class: 'font-medium' }, `${professional.name}${!professional.active ? ' (inativo)' : ''}`),
          el('p', { class: 'text-sm text-muted' }, professional.email || professional.phone || '—'),
        ]),
        el('span', { class: 'text-sm', style: 'color:var(--brand);' }, 'Editar'),
      ]),
    );

    const nameInput = el('input', { type: 'text', value: professional.name, required: true });
    const emailInput = el('input', { type: 'email', value: professional.email || '' });
    const phoneInput = el('input', { type: 'text', value: professional.phone || '' });
    const activeInput = el('input', { type: 'checkbox', checked: professional.active, style: 'width:auto;' });

    const editForm = el('form', { class: 'stack-sm mt-4', style: 'border-top:1px solid var(--slate-100);padding-top:1rem;' }, [
      el('div', { class: 'field-row' }, [
        el('div', {}, [el('label', {}, 'Nome'), nameInput]),
        el('div', {}, [el('label', {}, 'E-mail'), emailInput]),
        el('div', {}, [el('label', {}, 'Telefone'), phoneInput]),
      ]),
      el('label', { class: 'row text-sm', style: 'gap:0.4rem;' }, [activeInput, 'Ativo']),
      el('div', { class: 'row', style: 'flex-wrap:wrap;' }, [
        el('button', { type: 'submit', class: 'btn btn-primary' }, 'Salvar'),
        el('a', { href: `/admin/availability.html?id=${professional.id}`, class: 'btn btn-secondary' }, 'Definir horários'),
      ]),
    ]);
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await supabase
        .from('professionals')
        .update({ name: nameInput.value, email: emailInput.value || null, phone: phoneInput.value || null, active: activeInput.checked })
        .eq('id', professional.id);
      await refresh();
    });
    details.appendChild(editForm);

    details.appendChild(
      el(
        'button',
        {
          class: 'btn btn-danger mt-2',
          onclick: async () => {
            await supabase.from('professionals').delete().eq('id', professional.id);
            await refresh();
          },
        },
        'Excluir profissional',
      ),
    );

    container.appendChild(el('div', { class: 'card' }, [details]));
  }
}

async function refresh() {
  renderList(await loadProfessionals());
}

async function main() {
  const session = await requireSession();
  if (!session) return;
  company = await renderAdminNav('/admin/professionals.html');

  document.getElementById('new-professional-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    await supabase.from('professionals').insert({
      company_id: company.id,
      name: data.get('name'),
      email: data.get('email') || null,
      phone: data.get('phone') || null,
    });
    form.reset();
    await refresh();
  });

  await refresh();
}

main();
