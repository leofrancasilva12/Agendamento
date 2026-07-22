// Edge Function agendada (Supabase Cron) que roda periodicamente e envia
// lembrete de WhatsApp para agendamentos confirmados que começam entre 23
// e 25 horas a partir de agora e ainda não receberam lembrete.
//
// Deploy: supabase functions deploy send-reminders
// Agendar: supabase functions schedule send-reminders --cron "0 * * * *"
// (a cada hora — ver README para o passo a passo completo)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function callWhatsappWebhook(payload: Record<string, unknown>) {
  const url = Deno.env.get('N8N_BOOKING_REMINDER_WEBHOOK_URL');
  if (!url) {
    console.log('[whatsapp:no-op] Webhook n8n de lembrete não configurado.');
    return { sent: false, reason: 'Webhook não configurado' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook respondeu ${res.status}`);
    return { sent: true };
  } catch (error) {
    console.error('Falha ao chamar webhook n8n', error);
    return { sent: false, reason: String(error) };
  }
}

Deno.serve(async () => {
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60_000).toISOString();
  const windowEnd = new Date(now + 25 * 60 * 60_000).toISOString();

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, start_at, company:companies(name), service:services(name), professional:professionals(name), client:clients(name, phone)')
    .eq('status', 'CONFIRMED')
    .is('reminder_sent_at', null)
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd);

  if (error) {
    console.error('Falha ao buscar agendamentos', error);
    return new Response('error', { status: 500 });
  }

  let sent = 0;
  for (const booking of bookings ?? []) {
    const result = await callWhatsappWebhook({
      event: 'booking.reminder',
      companyName: booking.company?.name,
      clientName: booking.client?.name,
      clientPhone: booking.client?.phone,
      serviceName: booking.service?.name,
      professionalName: booking.professional?.name,
      startAt: booking.start_at,
    });

    await supabaseAdmin.from('notification_log').insert({
      booking_id: booking.id,
      channel: 'WHATSAPP',
      status: result.sent ? 'SENT' : 'SKIPPED',
      error: result.sent ? null : result.reason,
    });
    await supabaseAdmin.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', booking.id);
    if (result.sent) sent += 1;
  }

  return new Response(JSON.stringify({ processed: bookings?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
