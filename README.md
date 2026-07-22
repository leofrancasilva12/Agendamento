# Agendamento

Sistema de agendamento online multiempresa: cada negócio tem um painel
administrativo e uma página pública de agendamento (`/{slug}`) para os
clientes marcarem horários sozinhos.

Ver a arquitetura completa em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

Site estático (HTML/CSS/JS puro, sem build) hospedado na **Vercel**,
consumindo o **Supabase** diretamente do navegador — Postgres + Auth + Row
Level Security + funções (RPC) fazem o papel do backend. Não há servidor
Node/API própria.

- `index.html`, `empresa.html` (página pública de agendamento), `admin/*.html`
- `js/` — lógica de cada página (vanilla JS, `type="module"`)
- `css/styles.css` — design system simples, sem framework CSS
- `supabase/` — schema SQL, funções RPC, seed, Edge Functions

## Como rodar localmente

Não tem servidor pra rodar — é só abrir os arquivos com qualquer servidor
estático. Duas coisas precisam estar prontas antes:

### 1. Criar o projeto no Supabase e aplicar o schema

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor** do projeto e rode, nesta ordem:
   1. `supabase/schema.sql` (tabelas + Row Level Security)
   2. `supabase/functions.sql` (funções RPC — disponibilidade, criar
      agendamento, cadastro de empresa, etc.)
   3. `supabase/seed.sql` (opcional — cria a empresa de exemplo
      `salao-exemplo` com catálogo de serviços/profissionais)

### 2. Configurar as chaves do projeto no site

Edite `js/config.js` com a URL e a `anon key` do seu projeto (**Project
Settings → API**):

```js
window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.SUPABASE_ANON_KEY = 'sua-anon-key-publica';
```

> A `anon key` é pública por design (é o que o navegador usa) — a segurança
> real vem das políticas de Row Level Security no banco, não do sigilo da
> chave. Por isso `js/config.js` pode ficar versionado normalmente.

### 3. Servir os arquivos estáticos

Qualquer servidor estático funciona, por exemplo:

```bash
npx serve .
# ou: python3 -m http.server 8000
```

- Página pública de agendamento: `http://localhost:PORT/salao-exemplo`
- Painel admin: `http://localhost:PORT/admin/login.html`

Crie sua conta de admin em `admin/register.html` (a empresa `salao-exemplo`
do seed não tem dono — é só o catálogo público de exemplo).

> **Confirmação de e-mail**: se o seu projeto Supabase exigir confirmação
> de e-mail (padrão em projetos novos), o cadastro da empresa só é
> concluído no primeiro login *depois* de confirmar o e-mail — o site já
> trata esse fluxo automaticamente. Pra testar mais rápido em
> desenvolvimento, você pode desligar "Confirm email" em **Authentication →
> Providers → Email** nas configurações do projeto.

## Deploy em produção

### Vercel (frontend)

1. Importe o repositório na Vercel — **Root Directory** = raiz do repo
   (não tem subpasta, é um site estático simples).
2. Não precisa de build command (framework preset "Other"/estático) — o
   `js/config.js` já commitado com a URL/anon key do seu projeto Supabase
   vai junto no deploy.
3. Deploy.

### Supabase (backend)

Já está pronto assim que você aplicar `schema.sql` + `functions.sql` no
projeto — não tem servidor pra hospedar. Só falta, opcionalmente:

- **Edge Functions** para notificações reais (ver seção abaixo)
- Desligar "Confirm email" (ou configurar o provedor de e-mail do Supabase)
  se quiser cadastro de empresa sem esse passo extra

## Notificações (e-mail / WhatsApp)

Implementadas como **Supabase Edge Functions** (`supabase/edge/`):

- **`send-notification`**: disparada por um *Database Webhook* em `INSERT`
  na tabela `bookings` (configure em **Database → Webhooks** apontando
  para a função). Envia e-mail de confirmação (via [Resend](https://resend.com),
  configurável) e chama um webhook de WhatsApp (n8n, Twilio, etc.).
- **`send-reminders`**: agendada via Supabase Cron (`supabase functions
  schedule`), roda periodicamente e envia lembrete 24h antes.

Deploy (requer [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase functions deploy send-notification
supabase functions deploy send-reminders
supabase functions schedule send-reminders --cron "0 * * * *"

supabase secrets set \
  RESEND_API_KEY=... \
  EMAIL_FROM=no-reply@seudominio.com.br \
  N8N_BOOKING_CREATED_WEBHOOK_URL=... \
  N8N_BOOKING_REMINDER_WEBHOOK_URL=...
```

Sem essas variáveis configuradas, as funções só logam (não quebram o
agendamento).

## Testado

- Todo o SQL (`schema.sql`, `functions.sql`, `seed.sql`) validado num
  Postgres local simulando o Supabase (schema `auth` + papéis `anon`/
  `authenticated` + Row Level Security real, sem bypass de superusuário):
  isolamento entre empresas, "sem preferência" escolhendo profissional
  automaticamente e evitando duplo agendamento, dedup de cliente por
  telefone, `register_company`/`set_availability`/`set_company_hours`/
  `dashboard_summary`, e — importante — que dados sensíveis
  (e-mail/telefone de `companies` e `professionals`) **não** vazam nas
  rotas públicas.
- Fluxo completo no navegador (Playwright) contra um mock local do cliente
  Supabase: wizard público de agendamento e painel admin.

## Roadmap

Ver seção "Funcionalidades Extras" em [`ARCHITECTURE.md`](./ARCHITECTURE.md).
