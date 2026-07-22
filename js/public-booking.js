import { supabase } from './supabaseClient.js';
import { el, clear, showError, hideError, formatPrice, formatDuration, WEEKDAY_LABELS, WEEKDAY_SHORT } from './utils.js';

const slug = decodeURIComponent(window.location.pathname.replace(/^\/+/, '').split('/')[0] || '');

const els = {
  notFound: document.getElementById('not-found'),
  content: document.getElementById('content'),
  logo: document.getElementById('company-logo'),
  name: document.getElementById('company-name'),
  errorBox: document.getElementById('error-box'),
  steps: document.getElementById('steps'),
  wizard: document.getElementById('wizard'),
  teamSection: document.getElementById('team-section'),
  teamCarousel: document.getElementById('team-carousel'),
  locationSection: document.getElementById('location-section'),
  locationAddress: document.getElementById('location-address'),
  locationMapsLink: document.getElementById('location-maps-link'),
  hoursSection: document.getElementById('hours-section'),
  hoursBody: document.getElementById('hours-body'),
  socialSection: document.getElementById('social-section'),
  socialLinks: document.getElementById('social-links'),
};

const state = {
  step: 'service',
  company: null,
  services: [],
  service: null,
  professionals: [],
  professionalId: undefined, // undefined = not chosen yet, null = "sem preferência"
  date: null,
  slots: [],
  time: null,
  loading: false,
  form: { name: '', phone: '', email: '', notes: '' },
  confirmedAt: null,
};

async function init() {
  if (!slug) {
    els.notFound.classList.remove('hidden');
    return;
  }

  const { data: companies, error } = await supabase.rpc('get_public_company', { p_slug: slug });
  if (error || !companies || companies.length === 0) {
    els.notFound.classList.remove('hidden');
    return;
  }
  state.company = companies[0];

  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, image_url, duration_minutes, price_cents, category:service_categories(id, name, order)')
    .eq('company_id', state.company.id)
    .eq('active', true)
    .order('name');
  state.services = services || [];

  const { data: professionals } = await supabase.rpc('get_public_professionals', {
    p_slug: slug,
    p_service_id: null,
  });

  els.content.classList.remove('hidden');
  if (state.company.logo_url) {
    els.logo.src = state.company.logo_url;
    els.logo.classList.remove('hidden');
  }
  els.name.textContent = state.company.name;
  document.title = state.company.name;

  renderTeam(professionals || []);
  renderLocation();
  await renderHours();
  renderSocial();
  render();
}

function renderTeam(professionals) {
  if (professionals.length === 0) return;
  let index = 0;

  function paint() {
    clear(els.teamCarousel);
    const p = professionals[index];
    const children = [];
    if (professionals.length > 1) {
      children.push(
        el('button', { class: 'btn btn-ghost', onclick: () => { index = (index - 1 + professionals.length) % professionals.length; paint(); } }, '‹'),
      );
    }
    const avatar = p.avatar_url
      ? el('img', { src: p.avatar_url, class: 'avatar', style: 'width:7rem;height:7rem;' })
      : el('div', { class: 'avatar-fallback', style: 'width:7rem;height:7rem;font-size:1.5rem;' }, p.name.charAt(0));
    children.push(el('div', {}, [avatar, el('p', { class: 'font-medium mt-2' }, p.name)]));
    if (professionals.length > 1) {
      children.push(
        el('button', { class: 'btn btn-ghost', onclick: () => { index = (index + 1) % professionals.length; paint(); } }, '›'),
      );
    }
    els.teamCarousel.append(...children);
  }
  paint();
  els.teamSection.classList.remove('hidden');
}

function renderLocation() {
  if (!state.company.address_line) return;
  els.locationAddress.textContent = state.company.address_line;
  els.locationMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(state.company.address_line)}`;
  els.locationSection.classList.remove('hidden');
}

async function renderHours() {
  const { data: hours } = await supabase
    .from('company_hours')
    .select('*')
    .eq('company_id', state.company.id)
    .order('weekday');
  if (!hours || hours.length === 0) return;
  clear(els.hoursBody);
  for (const day of hours) {
    els.hoursBody.appendChild(
      el('tr', {}, [
        el('td', {}, WEEKDAY_LABELS[day.weekday]),
        el(
          'td',
          { class: day.closed ? 'text-muted' : 'font-medium', style: 'text-align:right' },
          day.closed ? 'Fechado' : `${day.start_time?.slice(0, 5)} - ${day.end_time?.slice(0, 5)}`,
        ),
      ]),
    );
  }
  els.hoursSection.classList.remove('hidden');
}

function renderSocial() {
  const { instagram_url, facebook_url, whatsapp_number } = state.company;
  if (!instagram_url && !facebook_url && !whatsapp_number) return;
  const link = (href, label, bg) =>
    el(
      'a',
      {
        href,
        target: '_blank',
        rel: 'noreferrer',
        style: `width:2.75rem;height:2.75rem;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#fff;background:${bg};text-decoration:none;font-size:0.75rem;font-weight:600;`,
      },
      label,
    );
  if (instagram_url) els.socialLinks.appendChild(link(instagram_url, 'IG', 'linear-gradient(45deg,#f59e0b,#ec4899,#8b5cf6)'));
  if (facebook_url) els.socialLinks.appendChild(link(facebook_url, 'FB', '#2563eb'));
  if (whatsapp_number) els.socialLinks.appendChild(link(`https://wa.me/55${whatsapp_number.replace(/\D/g, '')}`, 'WA', '#22c55e'));
  els.socialSection.classList.remove('hidden');
}

// ---------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------

function groupByCategory(services) {
  const groups = new Map();
  for (const service of services) {
    const key = service.category?.id ?? 'uncategorized';
    const name = service.category?.name ?? 'Outros';
    const order = service.category?.order ?? Number.MAX_SAFE_INTEGER;
    if (!groups.has(key)) groups.set(key, { name, order, services: [] });
    groups.get(key).services.push(service);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

function renderSteps() {
  clear(els.steps);
  if (state.step === 'confirmation') return;
  const order = ['service', 'professional', 'datetime', 'details'];
  const labels = { service: 'Serviço', professional: 'Profissional', datetime: 'Data/hora', details: 'Seus dados' };
  const current = order.indexOf(state.step);
  for (let i = 0; i < order.length; i++) {
    els.steps.appendChild(el('span', { class: i === current ? 'active' : '' }, labels[order[i]]));
  }
}

async function selectService(service) {
  state.service = service;
  state.loading = true;
  render();
  const { data: professionals, error } = await supabase.rpc('get_public_professionals', {
    p_slug: slug,
    p_service_id: service.id,
  });
  state.loading = false;
  if (error) {
    showError(els.errorBox, 'Não foi possível carregar os profissionais.');
    render();
    return;
  }
  state.professionals = professionals || [];
  state.step = 'professional';
  render();
}

function selectProfessional(id) {
  state.professionalId = id;
  state.date = null;
  state.slots = [];
  state.time = null;
  state.step = 'datetime';
  render();
}

async function loadSlots() {
  if (!state.date) return;
  state.loading = true;
  state.time = null;
  render();
  const { data, error } = await supabase.rpc('get_availability', {
    p_slug: slug,
    p_service_id: state.service.id,
    p_date: state.date,
    p_professional_id: state.professionalId ?? null,
  });
  state.loading = false;
  if (error) {
    showError(els.errorBox, 'Não foi possível carregar os horários.');
  } else {
    state.slots = (data || []).map((r) => r.slot_time);
  }
  render();
}

async function submitBooking() {
  state.loading = true;
  render();
  const { data, error } = await supabase.rpc('create_booking', {
    p_slug: slug,
    p_service_id: state.service.id,
    p_date: state.date,
    p_time: state.time,
    p_client_name: state.form.name,
    p_client_phone: state.form.phone,
    p_client_email: state.form.email || null,
    p_notes: state.form.notes || null,
    p_professional_id: state.professionalId ?? null,
  });
  state.loading = false;
  if (error) {
    if (error.message?.includes('slot not available')) {
      showError(els.errorBox, 'Esse horário acabou de ser reservado. Escolha outro horário.');
      state.step = 'datetime';
      await loadSlots();
      return;
    }
    showError(els.errorBox, 'Erro ao criar agendamento. Tente novamente.');
    render();
    return;
  }
  state.confirmedAt = data.start_at;
  state.step = 'confirmation';
  render();
}

function renderCalendar(container) {
  const today = new Date();
  const min = today.toISOString().slice(0, 10);
  const base = state.date ? new Date(`${state.date}T00:00:00`) : new Date(`${min}T00:00:00`);
  let cursor = new Date(base.getFullYear(), base.getMonth(), 1);

  function paint() {
    clear(container);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const minMonth = new Date(`${min}T00:00:00`);
    const atMinMonth = year === minMonth.getFullYear() && month === minMonth.getMonth();
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const header = el('div', { class: 'row-between mb-3' }, [
      el('button', { class: 'btn btn-ghost', disabled: atMinMonth, onclick: () => { cursor = new Date(year, month - 1, 1); paint(); } }, '← Anterior'),
      el('span', { class: 'text-sm font-medium' }, `${monthNames[month]} ${year}`),
      el('button', { class: 'btn btn-ghost', onclick: () => { cursor = new Date(year, month + 1, 1); paint(); } }, 'Próximo →'),
    ]);

    const weekdayRow = el('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:0.75rem;color:var(--slate-400);' },
      WEEKDAY_SHORT.map((d) => el('div', { style: 'padding:0.25rem 0' }, d)));

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(el('div'));
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = new Date(year, month, day).toISOString().slice(0, 10);
      const disabled = iso < min;
      const selected = iso === state.date;
      cells.push(
        el(
          'button',
          {
            disabled,
            onclick: () => { state.date = iso; loadSlots(); },
            style: `aspect-ratio:1;border:none;border-radius:0.5rem;font-size:0.875rem;cursor:${disabled ? 'default' : 'pointer'};background:${selected ? 'var(--brand)' : 'transparent'};color:${selected ? '#fff' : disabled ? 'var(--slate-300)' : 'var(--slate-700)'};`,
          },
          String(day),
        ),
      );
    }
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:0.25rem;' }, cells);

    container.append(header, weekdayRow, grid);
  }
  paint();
}

function render() {
  renderSteps();
  hideError(els.errorBox);
  clear(els.wizard);

  if (state.step === 'service') {
    const groups = groupByCategory(state.services);
    const sections = groups.map((group) =>
      el('div', {}, [
        el('h2', { class: 'text-lg font-semibold mb-3' }, group.name),
        el(
          'div',
          { class: 'stack-sm' },
          group.services.map((s) =>
            el(
              'button',
              { class: 'option-card', disabled: state.loading, onclick: () => selectService(s) },
              [
                s.image_url
                  ? el('img', { src: s.image_url, class: 'avatar', style: 'width:3.5rem;height:3.5rem;flex-shrink:0;' })
                  : el('div', { class: 'avatar-fallback', style: 'width:3.5rem;height:3.5rem;flex-shrink:0;' }, s.name.charAt(0)),
                el('div', { style: 'flex:1' }, [
                  el('p', { class: 'font-medium' }, s.name),
                  s.description ? el('p', { class: 'text-sm text-muted' }, s.description) : null,
                  el('p', { class: 'text-sm text-muted' }, formatDuration(s.duration_minutes)),
                ]),
                el('span', { class: 'font-semibold', style: 'color:var(--brand)' }, formatPrice(s.price_cents)),
              ],
            ),
          ),
        ),
      ]),
    );
    els.wizard.appendChild(el('div', { class: 'stack' }, sections));
    return;
  }

  if (state.step === 'professional') {
    const cards = [
      el(
        'button',
        { class: 'option-card', style: 'flex-direction:column;text-align:center;', onclick: () => selectProfessional(null) },
        [el('div', { class: 'avatar-fallback', style: 'width:3.5rem;height:3.5rem;' }, '?'), el('p', { class: 'font-medium mt-2' }, 'Sem preferência')],
      ),
      ...state.professionals.map((p) =>
        el(
          'button',
          { class: 'option-card', style: 'flex-direction:column;text-align:center;', onclick: () => selectProfessional(p.id) },
          [
            p.avatar_url
              ? el('img', { src: p.avatar_url, class: 'avatar', style: 'width:3.5rem;height:3.5rem;' })
              : el('div', { class: 'avatar-fallback', style: 'width:3.5rem;height:3.5rem;' }, p.name.charAt(0)),
            el('p', { class: 'font-medium mt-2' }, p.name),
          ],
        ),
      ),
    ];
    els.wizard.appendChild(
      el('div', { class: 'stack-sm' }, [
        el('div', { style: 'display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;' }, cards),
        el('button', { class: 'btn btn-ghost', onclick: () => { state.step = 'service'; render(); } }, '← Voltar'),
      ]),
    );
    return;
  }

  if (state.step === 'datetime') {
    const calendarContainer = el('div');
    const card = el('div', { class: 'card' }, [calendarContainer]);
    renderCalendar(calendarContainer);

    if (state.date) {
      card.appendChild(el('p', { class: 'text-sm font-medium mt-4 mb-2' }, 'Horários disponíveis'));
      if (state.loading) {
        card.appendChild(el('p', { class: 'text-sm text-muted' }, 'Carregando...'));
      } else if (state.slots.length === 0) {
        card.appendChild(el('p', { class: 'text-sm text-muted' }, 'Nenhum horário disponível nesta data.'));
      } else {
        card.appendChild(
          el(
            'div',
            { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;' },
            state.slots.map((s) =>
              el(
                'button',
                {
                  class: 'btn',
                  style: s === state.time
                    ? 'background:var(--brand);color:#fff;border-color:var(--brand);'
                    : 'background:#fff;border:1px solid var(--slate-300);color:var(--slate-900);',
                  onclick: () => { state.time = s; render(); },
                },
                s,
              ),
            ),
          ),
        );
      }
    }

    card.appendChild(
      el('div', { class: 'row-between mt-4' }, [
        el('button', { class: 'btn btn-ghost', onclick: () => { state.step = 'professional'; render(); } }, '← Voltar'),
        el('button', { class: 'btn btn-primary', disabled: !state.time, onclick: () => { state.step = 'details'; render(); } }, 'Continuar'),
      ]),
    );
    els.wizard.appendChild(card);
    return;
  }

  if (state.step === 'details') {
    const nameInput = el('input', { type: 'text', value: state.form.name, oninput: (e) => (state.form.name = e.target.value) });
    const phoneInput = el('input', { type: 'tel', placeholder: '11999990000', value: state.form.phone, oninput: (e) => (state.form.phone = e.target.value) });
    const emailInput = el('input', { type: 'email', value: state.form.email, oninput: (e) => (state.form.email = e.target.value) });
    const notesInput = el('textarea', { rows: 3, placeholder: 'Caso necessite, adicione uma observação para seu agendamento.', oninput: (e) => (state.form.notes = e.target.value) }, state.form.notes);

    const submitBtn = el(
      'button',
      {
        class: 'btn btn-primary',
        disabled: state.loading || !state.form.name || state.form.phone.length < 8,
        onclick: submitBooking,
      },
      state.loading ? 'Confirmando...' : 'Confirmar agendamento',
    );

    els.wizard.appendChild(
      el('div', { class: 'card' }, [
        el('div', { class: 'field' }, [el('label', {}, 'Nome'), nameInput]),
        el('div', { class: 'field' }, [el('label', {}, 'Telefone (WhatsApp)'), phoneInput]),
        el('div', { class: 'field' }, [el('label', {}, 'E-mail (opcional)'), emailInput]),
        el('div', { class: 'field' }, [el('label', {}, 'Observações (opcional)'), notesInput]),
        el('div', { class: 'row-between mt-2' }, [
          el('button', { class: 'btn btn-ghost', onclick: () => { state.step = 'datetime'; render(); } }, '← Voltar'),
          submitBtn,
        ]),
      ]),
    );

    // re-render on input to keep the submit button's disabled state in sync
    for (const input of [nameInput, phoneInput]) {
      input.addEventListener('input', () => {
        submitBtn.disabled = state.loading || !state.form.name || state.form.phone.length < 8;
      });
    }
    return;
  }

  if (state.step === 'confirmation') {
    const professionalName = state.professionals.find((p) => p.id === state.professionalId)?.name;
    els.wizard.appendChild(
      el('div', { class: 'card text-center' }, [
        el('div', { class: 'avatar-fallback', style: 'width:3rem;height:3rem;margin:0 auto 0.75rem;background:var(--green-100);color:var(--green-600);font-size:1.25rem;' }, '✓'),
        el('h2', { class: 'text-lg font-semibold' }, 'Agendamento confirmado!'),
        el('p', { class: 'text-sm text-muted mt-2' }, [
          `${state.service.name}${professionalName ? ` com ${professionalName}` : ''}`,
          el('br'),
          state.confirmedAt ? new Date(state.confirmedAt).toLocaleString('pt-BR') : '',
        ]),
        el('p', { class: 'text-xs text-muted mt-3' }, 'Você receberá uma confirmação por e-mail/WhatsApp.'),
      ]),
    );
  }
}

init();
