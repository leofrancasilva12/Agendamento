import { supabase } from '/js/supabaseClient.js';
import { el, clear, getParam, WEEKDAY_LABELS } from '/js/utils.js';
import { requireSession } from './guard.js';
import { renderAdminNav } from './nav.js';

async function main() {
  const session = await requireSession();
  if (!session) return;
  await renderAdminNav('/admin/professionals.html');

  const professionalId = getParam('id');
  if (!professionalId) {
    window.location.href = '/admin/professionals.html';
    return;
  }

  const { data: professional } = await supabase.from('professionals').select('*').eq('id', professionalId).single();
  if (!professional) {
    window.location.href = '/admin/professionals.html';
    return;
  }
  document.getElementById('title').textContent = `Horários de ${professional.name}`;

  const { data: slots } = await supabase.from('availability').select('*').eq('professional_id', professionalId).order('weekday');
  const byWeekday = new Map((slots || []).map((s) => [s.weekday, s]));

  const form = document.getElementById('availability-form');
  const rowInputs = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const slot = byWeekday.get(weekday);
    const activeInput = el('input', { type: 'checkbox', checked: Boolean(slot), style: 'width:auto;' });
    const startInput = el('input', { type: 'time', value: slot?.start_time?.slice(0, 5) ?? '09:00', style: 'width:auto;' });
    const endInput = el('input', { type: 'time', value: slot?.end_time?.slice(0, 5) ?? '18:00', style: 'width:auto;' });
    rowInputs.push({ weekday, activeInput, startInput, endInput });

    form.appendChild(
      el('div', { class: 'row', style: 'border-bottom:1px solid var(--slate-100);padding-bottom:0.75rem;flex-wrap:wrap;' }, [
        el('label', { class: 'row text-sm font-medium', style: 'width:9rem;gap:0.4rem;' }, [activeInput, WEEKDAY_LABELS[weekday]]),
        startInput,
        el('span', { class: 'text-muted' }, 'até'),
        endInput,
      ]),
    );
  }

  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary mt-2' }, 'Salvar horários');
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;
    const payload = rowInputs
      .filter((r) => r.activeInput.checked)
      .map((r) => ({ weekday: r.weekday, start_time: r.startInput.value, end_time: r.endInput.value }));

    await supabase.rpc('set_availability', { p_professional_id: professionalId, p_slots: payload });
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvo ✓';
    setTimeout(() => (submitBtn.textContent = 'Salvar horários'), 1500);
  });
}

main();
