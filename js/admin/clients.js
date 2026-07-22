import { supabase } from '/js/supabaseClient.js';
import { el, clear } from '/js/utils.js';
import { requireSession } from './guard.js';
import { renderAdminNav } from './nav.js';

let company;

async function refresh() {
  const { data: clients } = await supabase.from('clients').select('*').eq('company_id', company.id).order('name');
  const body = document.getElementById('clients-body');
  const emptyMessage = document.getElementById('empty-message');
  clear(body);

  emptyMessage.classList.toggle('hidden', (clients || []).length > 0);

  for (const client of clients || []) {
    body.appendChild(
      el('tr', {}, [
        el('td', { class: 'font-medium' }, client.name),
        el('td', {}, client.phone),
        el('td', {}, client.email || '—'),
        el('td', { style: 'text-align:right;' }, [
          el(
            'button',
            {
              class: 'btn btn-danger',
              onclick: async () => {
                await supabase.from('clients').delete().eq('id', client.id);
                await refresh();
              },
            },
            'Excluir',
          ),
        ]),
      ]),
    );
  }
}

async function main() {
  const session = await requireSession();
  if (!session) return;
  company = await renderAdminNav('/admin/clients.html');

  document.getElementById('new-client-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    await supabase.from('clients').insert({
      company_id: company.id,
      name: data.get('name'),
      phone: data.get('phone'),
      email: data.get('email') || null,
    });
    form.reset();
    await refresh();
  });

  await refresh();
}

main();
