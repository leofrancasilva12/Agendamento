import { supabase } from '/js/supabaseClient.js';
import { el, clear, formatPrice, WEEKDAY_SHORT, getParam } from '/js/utils.js';
import { requireSession } from './guard.js';
import { renderAdminNav } from './nav.js';

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 15;
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const ROW_HEIGHT = 16;

const COLOR_PALETTE = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { bg: '#cffafe', border: '#67e8f9', text: '#155e75' },
  { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
];

const STATUS_LABEL = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
};

function colorForProfessional(id) {
  let hash = 5381;
  for (const ch of id) hash = (hash * 33) ^ ch.charCodeAt(0);
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}
function sundayOf(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
}
function formatRange(start, end) {
  const fmt = (iso, withYear) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: withYear ? 'numeric' : undefined,
    });
  return `${fmt(start, false)} – ${fmt(end, true)}`;
}
function toSlot(date) {
  const minutes = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
  return Math.min(Math.max(minutes / SLOT_MINUTES, 0), SLOTS_PER_DAY);
}

function layoutDay(bookings) {
  const sorted = [...bookings].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const laneEnds = [];
  const placed = sorted.map((booking) => {
    let lane = laneEnds.findIndex((end) => end <= booking.start_at);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(booking.end_at);
    } else {
      laneEnds[lane] = booking.end_at;
    }
    return { ...booking, lane };
  });
  const totalLanes = Math.max(1, laneEnds.length);
  return placed.map((b) => ({ ...b, lanes: totalLanes }));
}

async function main() {
  const session = await requireSession();
  if (!session) return;
  const company = await renderAdminNav('/admin/dashboard.html');

  const todayWeek = toIso(sundayOf(new Date()));
  const weekParam = getParam('week');
  const weekStart = weekParam ? toIso(sundayOf(new Date(`${weekParam}T00:00:00`))) : todayWeek;
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const professionalId = getParam('professionalId') || '';

  const [{ data: professionals }, { data: summaryRows }] = await Promise.all([
    supabase.from('professionals').select('*').eq('company_id', company.id).order('created_at'),
    supabase.rpc('dashboard_summary'),
  ]);

  let bookingsQuery = supabase
    .from('bookings')
    .select('*, service:services(*), professional:professionals(*), client:clients(*)')
    .eq('company_id', company.id)
    .gte('start_at', `${weekStart}T00:00:00`)
    .lt('start_at', `${addDays(weekEnd, 1)}T00:00:00`)
    .order('start_at');
  if (professionalId) bookingsQuery = bookingsQuery.eq('professional_id', professionalId);
  const { data: bookings } = await bookingsQuery;

  renderStats(summaryRows?.[0]);
  renderToolbar({ weekStart, todayWeek, professionals: professionals || [], professionalId });
  renderCalendar({ days, bookings: bookings || [] });
}

function renderStats(summary) {
  const container = document.getElementById('stats');
  clear(container);
  const items = [
    ['Hoje', summary?.today_count ?? 0],
    ['Serviços ativos', summary?.active_services ?? 0],
    ['Profissionais ativos', summary?.active_professionals ?? 0],
    ['Clientes', summary?.total_clients ?? 0],
  ];
  for (const [label, value] of items) {
    container.appendChild(
      el('div', { class: 'card' }, [el('p', { class: 'text-xs text-muted' }, label), el('p', { class: 'text-xl font-semibold' }, String(value))]),
    );
  }
}

function renderToolbar({ weekStart, todayWeek, professionals, professionalId }) {
  const container = document.getElementById('toolbar');
  clear(container);

  function link(week, prof) {
    const params = new URLSearchParams({ week });
    if (prof) params.set('professionalId', prof);
    return `/admin/dashboard.html?${params.toString()}`;
  }

  const nav = el('div', { class: 'row' }, [
    el('a', { href: link(addDays(weekStart, -7), professionalId), class: 'btn btn-secondary' }, '←'),
    el('a', { href: link(todayWeek, professionalId), class: 'btn btn-secondary' }, 'Hoje'),
    el('a', { href: link(addDays(weekStart, 7), professionalId), class: 'btn btn-secondary' }, '→'),
    el('span', { class: 'text-sm font-medium', style: 'margin-left:0.5rem;' }, formatRange(weekStart, addDays(weekStart, 6))),
  ]);

  const select = el(
    'select',
    {
      onchange: (e) => {
        window.location.href = link(weekStart, e.target.value);
      },
    },
    [
      el('option', { value: '' }, 'Todos os profissionais'),
      ...professionals.map((p) => el('option', { value: p.id, selected: p.id === professionalId }, p.name)),
    ],
  );
  select.style.width = 'auto';

  container.append(nav, select);
}

function renderCalendar({ days, bookings }) {
  const container = document.getElementById('calendar');
  clear(container);

  const byDay = new Map(days.map((d) => [d, []]));
  for (const booking of bookings) {
    const day = booking.start_at.slice(0, 10);
    if (byDay.has(day)) byDay.get(day).push(booking);
  }
  const laidOut = new Map(days.map((d) => [d, layoutDay(byDay.get(d))]));

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const todayIso = new Date().toISOString().slice(0, 10);

  // Header row
  const headerRow = el('div', { class: 'row', style: 'align-items:flex-start;' }, [
    el('div', { style: 'width:3.5rem;flex-shrink:0;' }),
    ...days.map((day) => {
      const date = new Date(`${day}T00:00:00`);
      const isToday = day === todayIso;
      return el('div', { style: 'flex:1;text-align:center;' }, [
        el('p', { class: 'text-xs text-muted' }, WEEKDAY_SHORT[date.getDay()]),
        el(
          'p',
          {
            style: `margin:0 auto;width:1.75rem;height:1.75rem;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:500;${
              isToday ? 'background:var(--brand);color:#fff;' : ''
            }`,
          },
          String(date.getDate()),
        ),
      ]);
    }),
  ]);

  // Body: time labels + day columns
  const timeCol = el(
    'div',
    { class: 'calendar-time-col' },
    hourMarks.map((hour) =>
      el('div', { style: `height:${ROW_HEIGHT * 4}px;margin-top:-0.5rem;text-align:right;padding-right:0.35rem;` }, [
        el('span', { class: 'text-xs text-muted' }, `${String(hour).padStart(2, '0')}:00`),
      ]),
    ),
  );

  const dayColumns = days.map((day) => {
    const colHeight = ROW_HEIGHT * SLOTS_PER_DAY;
    const column = el('div', { class: 'calendar-day', style: `height:${colHeight}px;` });
    for (let i = 0; i < hourMarks.length; i++) {
      column.appendChild(el('div', { class: 'calendar-hour-line', style: `top:${i * ROW_HEIGHT * 4}px;` }));
    }
    for (const booking of laidOut.get(day)) {
      const start = toSlot(new Date(booking.start_at));
      const end = toSlot(new Date(booking.end_at));
      const width = 100 / booking.lanes;
      const color = colorForProfessional(booking.professional.id);
      const canceled = booking.status === 'CANCELED';
      column.appendChild(
        el(
          'button',
          {
            class: 'calendar-booking',
            onclick: () => openBookingModal(booking),
            style: `top:${start * ROW_HEIGHT}px;height:${Math.max((end - start) * ROW_HEIGHT, ROW_HEIGHT)}px;left:${booking.lane * width}%;width:${width}%;background:${color.bg};border-color:${color.border};color:${color.text};${canceled ? 'opacity:0.4;text-decoration:line-through;' : ''}`,
          },
          [el('span', { class: 'font-medium' }, booking.service.name), el('span', {}, booking.client.name)],
        ),
      );
    }
    return column;
  });

  const body = el('div', { class: 'row', style: 'align-items:flex-start;border-top:1px solid var(--slate-200);margin-top:0.5rem;' }, [
    timeCol,
    el('div', { class: 'calendar-days' }, dayColumns),
  ]);

  container.append(headerRow, body);
}

function openBookingModal(booking) {
  const root = document.getElementById('modal-root');
  clear(root);

  function close() {
    clear(root);
  }

  async function updateStatus(status) {
    await supabase.from('bookings').update({ status }).eq('id', booking.id);
    close();
    main();
  }

  const rows = [
    ['Cliente', booking.client.name],
    ['Telefone', booking.client.phone],
    ['Profissional', booking.professional.name],
    ['Valor', formatPrice(booking.service.price_cents)],
    ['Status', STATUS_LABEL[booking.status]],
  ];

  const dl = el(
    'dl',
    { class: 'text-sm stack-sm', style: 'gap:0.35rem;' },
    rows.map(([label, value]) => el('div', { class: 'row-between' }, [el('dt', { class: 'text-muted' }, label), el('dd', { class: 'font-medium', style: 'margin:0;' }, value)])),
  );

  const children = [
    el('div', { class: 'row-between mb-3' }, [
      el('div', {}, [
        el('p', { class: 'font-semibold' }, booking.service.name),
        el(
          'p',
          { class: 'text-sm text-muted' },
          new Date(booking.start_at).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        ),
      ]),
      el('button', { class: 'btn btn-ghost', onclick: close }, '✕'),
    ]),
    dl,
  ];

  if (booking.notes) {
    children.push(el('div', { class: 'mt-3' }, [el('p', { class: 'text-sm text-muted' }, 'Observações'), el('p', { class: 'text-sm mt-1' }, booking.notes)]));
  }

  if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
    const actions = el('div', { class: 'row mt-4', style: 'flex-wrap:wrap;' });
    if (booking.status === 'PENDING') {
      actions.appendChild(el('button', { class: 'btn btn-primary', onclick: () => updateStatus('CONFIRMED') }, 'Confirmar'));
    }
    actions.appendChild(el('button', { class: 'btn btn-secondary', onclick: () => updateStatus('COMPLETED') }, 'Concluir'));
    actions.appendChild(el('button', { class: 'btn btn-danger', onclick: () => updateStatus('CANCELED') }, 'Cancelar'));
    children.push(actions);
  }

  root.appendChild(
    el('div', { class: 'modal-overlay', onclick: (e) => { if (e.target === e.currentTarget) close(); } }, [el('div', { class: 'modal-box' }, children)]),
  );
}

main();
