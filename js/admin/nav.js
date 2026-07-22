import { el, clear } from '/js/utils.js';
import { getCurrentCompany, logout } from './guard.js';

const LINKS = [
  { href: '/admin/dashboard.html', label: 'Agenda' },
  { href: '/admin/services.html', label: 'Serviços' },
  { href: '/admin/professionals.html', label: 'Profissionais' },
  { href: '/admin/clients.html', label: 'Clientes' },
  { href: '/admin/settings.html', label: 'Configurações' },
];

export async function renderAdminNav(activeHref) {
  const mount = document.getElementById('admin-header');
  if (!mount) return;

  const company = await getCurrentCompany();

  const nav = el(
    'nav',
    { class: 'admin-nav' },
    LINKS.map((link) =>
      el(
        'a',
        { href: link.href, class: link.href === activeHref ? 'active' : '' },
        link.label,
      ),
    ),
  );

  const header = el('header', { class: 'admin-header' }, [
    el('div', { class: 'admin-header-inner' }, [
      el('div', { class: 'row', style: 'gap:2rem' }, [
        el('span', { class: 'font-semibold' }, company.name),
        nav,
      ]),
      el('button', { class: 'btn btn-ghost', onclick: logout }, 'Sair'),
    ]),
  ]);

  clear(mount);
  mount.appendChild(header);
  return company;
}
