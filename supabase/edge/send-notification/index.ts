// Edge Function acionada por um Database Webhook em INSERT na tabela
// "bookings" (configure em Supabase Dashboard → Database → Webhooks,
// apontando para esta função). Envia e-mail de confirmação e dispara o
// webhook de WhatsApp (n8n). Sem SMTP/webhook configurado, só loga
// (mesmo comportamento "no-op" do backend anterior).
//
// Deploy: supabase functions deploy send-notification
// Secrets: supabase secrets set RESEND_API_KEY=... EMAIL_FROM=... \
//          N8N_BOOKING_CREATED_WEBHOOK_URL=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    company_id: string;
    service_id: string;
    professional_id: string;
    client_id: string;
    start_at: string;
  };
}

async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'no-reply@agendamento.local';
  if (!apiKey) {
    console.log(`[email:no-op] Para: ${to} — ${subject}`);
    return { sent: false, reason: 'RESEND_API_KEY não configurado' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) throw new Error(`Resend respondeu ${res.status}`);
    return { sent: true };
  } catch (error) {
    console.error('Falha ao enviar e-mail', error);
    return { sent: false, reason: String(error) };
  }
}

async function callWhatsappWebhook(payload: Record<string, unknown>) {
  const url = Deno.env.get('N8N_BOOKING_CREATED_WEBHOOK_URL');
  if (!url) {
    console.log('[whatsapp:no-op] Webhook n8n não configurado.');
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

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  if (payload.table !== 'bookings' || payload.type !== 'INSERT') {
    return new Response('ignored', { status: 200 });
  }

  const booking = payload.record;

  const [{ data: company }, { data: service }, { data: professional }, { data: client }] = await Promise.all([
    supabaseAdmin.from('companies').select('name').eq('id', booking.company_id).single(),
    supabaseAdmin.from('services').select('name').eq('id', booking.service_id).single(),
    supabaseAdmin.from('professionals').select('name').eq('id', booking.professional_id).single(),
    supabaseAdmin.from('clients').select('name, phone, email').eq('id', booking.client_id).single(),
  ]);

  if (!company || !service || !professional || !client) {
    return new Response('missing related rows', { status: 200 });
  }

  const startAt = new Date(booking.start_at);
  const results: { channel: 'EMAIL' | 'WHATSAPP'; sent: boolean; reason?: string }[] = [];

  if (client.email) {
    const emailResult = await sendEmail(
      client.email,
      `Agendamento confirmado — ${company.name}`,
      [
        `Olá, ${client.name}!`,
        `Seu agendamento em ${company.name} foi confirmado.`,
        `Serviço: ${service.name}`,
        `Profissional: ${professional.name}`,
        `Data/hora: ${startAt.toLocaleString('pt-BR')}`,
      ].join('\n'),
    );
    results.push({ channel: 'EMAIL', ...emailResult });
  } else {
    results.push({ channel: 'EMAIL', sent: false, reason: 'Cliente sem e-mail' });
  }

  const whatsappResult = await callWhatsappWebhook({
    event: 'booking.created',
    companyName: company.name,
    clientName: client.name,
    clientPhone: client.phone,
    serviceName: service.name,
    professionalName: professional.name,
    startAt: booking.start_at,
  });
  results.push({ channel: 'WHATSAPP', ...whatsappResult });

  await supabaseAdmin.from('notification_log').insert(
    results.map((r) => ({
      booking_id: booking.id,
      channel: r.channel,
      status: r.sent ? 'SENT' : 'SKIPPED',
      error: r.sent ? null : r.reason,
    })),
  );

  return new Response('ok', { status: 200 });
});
