import { supabase } from '/js/supabaseClient.js';
import { el, WEEKDAY_LABELS } from '/js/utils.js';
import { requireSession, getCurrentCompany } from './guard.js';
import { renderAdminNav } from './nav.js';

async function main() {
  const session = await requireSession();
  if (!session) return;
  await renderAdminNav('/admin/settings.html');
  const company = await getCurrentCompany({ force: true });

  document.getElementById('public-url').textContent = `/${company.slug}`;

  const form = document.getElementById('company-form');
  form.name.value = company.name || '';
  form.phone.value = company.phone || '';
  form.primaryColor.value = company.primary_color || '#2563eb';
  form.timezone.value = company.timezone || 'America/Sao_Paulo';
  form.addressLine.value = company.address_line || '';
  form.instagramUrl.value = company.instagram_url || '';
  form.facebookUrl.value = company.facebook_url || '';
  form.whatsappNumber.value = company.whatsapp_number || '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    await supabase
      .from('companies')
      .update({
        name: form.name.value,
        phone: form.phone.value || null,
        primary_color: form.primaryColor.value,
        timezone: form.timezone.value,
        address_line: form.addressLine.value || null,
        instagram_url: form.instagramUrl.value || null,
        facebook_url: form.facebookUrl.value || null,
        whatsapp_number: form.whatsappNumber.value || null,
      })
      .eq('id', company.id);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvo ✓';
    setTimeout(() => (submitBtn.textContent = 'Salvar alterações'), 1500);
  });

  const { data: hours } = await supabase.from('company_hours').select('*').eq('company_id', company.id).order('weekday');
  const byWeekday = new Map((hours || []).map((h) => [h.weekday, h]));

  const hoursForm = document.getElementById('hours-form');
  const rowInputs = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const day = byWeekday.get(weekday);
    const closedInput = el('input', { type: 'checkbox', checked: day?.closed ?? weekday === 0, style: 'width:auto;' });
    const startInput = el('input', { type: 'time', value: day?.start_time?.slice(0, 5) ?? '09:00', style: 'width:auto;' });
    const endInput = el('input', { type: 'time', value: day?.end_time?.slice(0, 5) ?? '18:00', style: 'width:auto;' });
    rowInputs.push({ weekday, closedInput, startInput, endInput });

    hoursForm.appendChild(
      el('div', { class: 'row', style: 'border-bottom:1px solid var(--slate-100);padding-bottom:0.75rem;flex-wrap:wrap;' }, [
        el('span', { class: 'text-sm font-medium', style: 'width:9rem;' }, WEEKDAY_LABELS[weekday]),
        el('label', { class: 'row text-sm text-muted', style: 'gap:0.4rem;' }, [closedInput, 'Fechado']),
        startInput,
        el('span', { class: 'text-muted' }, 'até'),
        endInput,
      ]),
    );
  }
  const hoursSubmit = el('button', { type: 'submit', class: 'btn btn-primary mt-2' }, 'Salvar horários');
  hoursForm.appendChild(hoursSubmit);

  hoursForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hoursSubmit.disabled = true;
    const payload = rowInputs.map((r) => ({
      weekday: r.weekday,
      closed: r.closedInput.checked,
      start_time: r.startInput.value,
      end_time: r.endInput.value,
    }));
    await supabase.rpc('set_company_hours', { p_days: payload });
    hoursSubmit.disabled = false;
    hoursSubmit.textContent = 'Salvo ✓';
    setTimeout(() => (hoursSubmit.textContent = 'Salvar horários'), 1500);
  });
}

main();
