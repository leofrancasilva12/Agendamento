# Arquitetura — Agendamento (SaaS de agendamento online)

Sistema de agendamento online multiempresa (multi-tenant), inspirado no modelo de
produto do Agendin: cada negócio (salão, barbearia, clínica, etc.) tem uma conta
própria com um painel administrativo e uma página pública de agendamento
(`/{slug}`) onde os clientes finais marcam horários sem precisar de login.

> Nota: esta é uma implementação própria e independente, escrita do zero,
> reproduzindo o **conceito de produto** (agendamento online multiempresa com
> página pública + painel admin). Nenhum código, texto ou asset do site
> agendin.com.br foi copiado — não tivemos acesso ao conteúdo do site (bloqueado
> por proteção anti-bot) e não há garantia de paridade visual/textual exata.

## 1. Arquitetura Geral

```
┌─────────────────────┐        ┌──────────────────────┐        ┌────────────────┐
│   apps/web (Next.js) │  HTTP  │   apps/api (NestJS)   │  SQL   │  PostgreSQL     │
│  - Página pública     │ ─────▶ │  - Auth JWT           │ ─────▶ │  (via Prisma)   │
│    /[slug]             │ ◀───── │  - Módulos REST /v1   │ ◀───── │                 │
│  - Painel /admin       │        │  - Regra de slots     │        └────────────────┘
└─────────────────────┘        └──────────┬───────────┘
                                            │ webhook
                                            ▼
                                 ┌──────────────────────┐
                                 │  n8n (automação)      │
                                 │  - E-mail transacional │
                                 │  - WhatsApp (lembrete) │
                                 └──────────────────────┘
```

- **Frontend (apps/web)**: Next.js 14 (App Router). Duas áreas: pública
  (booking do cliente final, sem autenticação, por `slug` da empresa) e
  `/admin` (painel autenticado da empresa).
- **Backend (apps/api)**: NestJS + Prisma, API REST versionada (`/api/v1`),
  multiempresa por `companyId` derivado do JWT (rotas admin) ou do `slug`
  (rotas públicas).
- **Banco**: PostgreSQL. Todas as tabelas de domínio carregam `companyId`
  para isolamento lógico entre empresas (multi-tenant single-database).
- **Automação (n8n)**: recebe eventos via webhook (`booking.created`,
  `booking.reminder`) e dispara e-mail/WhatsApp. O backend expõe o gancho;
  o fluxo n8n em si é configurado à parte (ver seção 7).

## 2. Estrutura de Pastas — Frontend (`apps/web`)

```
apps/web/
  app/
    (public)/
      [slug]/
        page.tsx              # wizard de agendamento (serviço → profissional → horário → dados)
        layout.tsx
    admin/
      login/page.tsx
      layout.tsx               # guarda de sessão (lê cookie, redireciona se não logado)
      page.tsx                 # dashboard / agenda do dia
      services/page.tsx
      professionals/page.tsx
      professionals/[id]/availability/page.tsx
      clients/page.tsx
      settings/page.tsx
    api/
      auth/login/route.ts      # proxy para API, seta cookie httpOnly
      auth/logout/route.ts
    layout.tsx
    globals.css
  components/
    booking/                   # steps do wizard público
    admin/                     # tabelas, formulários, calendário
    ui/                        # botão, input, card (design system mínimo)
  lib/
    api.ts                     # client fetch tipado para a API
    session.ts                 # leitura do JWT em Server Components
  public/
```

## 3. Estrutura de Pastas — Backend (`apps/api`)

```
apps/api/
  prisma/
    schema.prisma
    seed.ts
  src/
    main.ts
    app.module.ts
    common/
      guards/jwt-auth.guard.ts
      guards/roles.guard.ts
      decorators/current-user.decorator.ts
      pipes/
    auth/
      auth.module.ts / auth.controller.ts / auth.service.ts
      strategies/jwt.strategy.ts
      dto/
    companies/
    services/                  # catálogo de serviços da empresa
    professionals/
    availability/              # horários de trabalho por profissional
    clients/
    bookings/
      bookings.service.ts      # cálculo de slots livres + criação
      public-bookings.controller.ts
      admin-bookings.controller.ts
    notifications/
      email.service.ts
      whatsapp.service.ts      # dispara webhook n8n
    dashboard/
    prisma/prisma.service.ts
```

## 4. Modelagem do Banco (Prisma)

Ver `apps/api/prisma/schema.prisma` (fonte da verdade, copiável). Resumo das
entidades:

| Tabela | Descrição |
|---|---|
| `Company` | Tenant. `slug` único = URL pública. |
| `User` | Login do painel admin. `role`: OWNER, STAFF. |
| `Professional` | Prestador de serviço da empresa. |
| `Service` | Serviço oferecido (duração, preço). |
| `ServiceProfessional` | N:N — quais profissionais atendem qual serviço. |
| `Availability` | Janela de trabalho recorrente (dia da semana + horário). |
| `Client` | Cliente final da empresa (quem agenda). |
| `Booking` | Agendamento: serviço + profissional + cliente + horário + status. |
| `NotificationLog` | Histórico de envios (e-mail/WhatsApp) por agendamento. |

Relacionamentos-chave: `Company 1—N {User, Professional, Service, Client,
Booking}`; `Professional 1—N Availability`; `Booking N—1 {Service,
Professional, Client}`.

## 5. Fluxo de Funcionamento

**Cliente final (página pública `/{slug}`):**
1. Abre `/{slug}` → API retorna dados da empresa (nome, logo, cor) e serviços ativos.
2. Escolhe um serviço → API retorna profissionais que atendem esse serviço.
3. Escolhe profissional e data → API calcula horários livres (`Availability`
   do profissional menos `Booking`s já ocupados menos duração do serviço).
4. Escolhe horário, preenche nome/telefone/e-mail → `POST
   /public/companies/:slug/bookings` cria o agendamento com status `PENDING`
   (ou `CONFIRMED` direto, configurável) e dispara notificação de confirmação.
5. Tela de confirmação com resumo.

**Empresa (painel `/admin`):**
1. `POST /auth/register` cria a empresa + usuário OWNER (ou login se já existe).
2. Login → cookie httpOnly com JWT (`companyId`, `sub`, `role`).
3. Dashboard mostra agenda do dia; navega por data/profissional.
4. CRUD de serviços, profissionais e seus horários de disponibilidade.
5. Gestão de clientes (lista, histórico de agendamentos).
6. Ações em um agendamento: confirmar, cancelar, marcar concluído/no-show.

## 6. Endpoints da API (`/api/v1`)

**Auth**
- `POST /auth/register` — cria empresa + usuário owner
- `POST /auth/login`
- `GET /auth/me`

**Público (por slug, sem auth)**
- `GET /public/companies/:slug`
- `GET /public/companies/:slug/services`
- `GET /public/companies/:slug/services/:serviceId/professionals`
- `GET /public/companies/:slug/availability?professionalId&serviceId&date`
- `POST /public/companies/:slug/bookings`

**Admin (JWT obrigatório)**
- `GET/PATCH /companies/me`
- `GET/POST/PATCH/DELETE /services`, `/services/:id`
- `GET/POST/PATCH/DELETE /professionals`, `/professionals/:id`
- `GET/PUT /professionals/:id/availability`
- `GET/POST/PATCH/DELETE /clients`, `/clients/:id`
- `GET /bookings?date&professionalId&status`
- `PATCH /bookings/:id/status`
- `GET /dashboard/summary`

## 7. Integrações n8n

Dois webhooks de saída do backend (`WhatsappService`/`EmailService`) chamam
fluxos n8n:

1. **`booking.created`** → recebe `{company, client, service, professional,
   startAt}` → envia e-mail de confirmação (nó SMTP/SendGrid) e mensagem
   WhatsApp (nó WhatsApp Business Cloud API ou Twilio).
2. **`booking.reminder`** → um cron job no NestJS (`@nestjs/schedule`,
   diário/horário) busca agendamentos que começam em ~24h e ainda não
   receberam lembrete, chama o webhook n8n `booking.reminder` para cada um.

As URLs dos webhooks ficam em `N8N_BOOKING_CREATED_WEBHOOK_URL` e
`N8N_BOOKING_REMINDER_WEBHOOK_URL` (`.env`). Sem essas variáveis, o serviço
faz *no-op* com log (permite rodar localmente sem n8n configurado).

## 8. Funcionalidades Extras (roadmap)

- Planos de assinatura por empresa (Stripe/Mercado Pago) com limites (nº de
  profissionais, nº de agendamentos/mês).
- Bloqueios avulsos de agenda (férias, folga) além da recorrência semanal.
- Página pública com tema por empresa (cor/logo já modelados em `Company`).
- Relatórios (faturamento por profissional/serviço, taxa de no-show).
- Avaliação pós-atendimento (link enviado após `COMPLETED`).

## 9. Segurança e Performance

- Senhas com `bcrypt`; JWT curto (ex.: 8h) + refresh via novo login.
- Cookie do painel admin: `httpOnly`, `secure` em produção, `sameSite=lax`.
- Toda query admin filtra por `companyId` do token — nunca por `id` bruto
  vindo do client, evitando vazamento entre tenants (IDOR).
- Rate limit nas rotas públicas de criação de agendamento (`@nestjs/throttler`)
  para evitar spam/abuso do formulário público.
- Validação de payload com `class-validator`/DTOs em todas as rotas.
- Cálculo de slots feito no servidor (nunca confiar em horário vindo do
  client) — o backend revalida disponibilidade no `POST /bookings`.
- Índices no Prisma em `(companyId)`, `(professionalId, startAt)`, `(slug)`.

## 10. Sugestão de Deploy

| Componente | Serviço | Custo estimado |
|---|---|---|
| Frontend (`apps/web`) | Vercel (Hobby/Pro) | R$0–100/mês |
| Backend (`apps/api`) | Railway ou Fly.io | ~R$40–120/mês |
| PostgreSQL | Railway Postgres / Supabase | R$0–80/mês |
| n8n | n8n Cloud ou VPS pequena | R$0–60/mês |
| **Total inicial** | | **~R$40–360/mês** conforme volume |

Dev local: `docker-compose up` sobe Postgres; `npm run dev` em cada app
(ver README para o passo a passo completo).
