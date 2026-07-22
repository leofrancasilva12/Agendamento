# Arquitetura — Agendamento (HTML/CSS/JS + Supabase)

Sistema de agendamento online multiempresa (multi-tenant): cada negócio
(salão, barbearia, clínica etc.) tem uma conta própria com um painel
administrativo e uma página pública de agendamento (`/{slug}`) onde os
clientes finais marcam horários sem precisar de login.

> Reescrita própria e independente do site agendin.com.br — reproduz o
> **conceito de produto** (agendamento online multiempresa com página
> pública + painel admin), sem copiar código, texto ou assets de terceiros.

## 1. Arquitetura Geral

Sem backend próprio: o navegador fala **diretamente** com o Supabase.

```
┌──────────────────────────┐        ┌───────────────────────────────┐
│  Site estático (Vercel)   │  HTTPS │  Supabase                       │
│  - HTML + CSS + JS puro    │ ─────▶ │  - Postgres + Row Level Security│
│    (sem build, sem SPA)    │ ◀───── │  - Auth (login do painel admin) │
│  - @supabase/supabase-js   │        │  - Funções RPC (regra de negócio)│
│    via CDN (esm.sh)         │        │  - Edge Functions (notificações)│
└──────────────────────────┘        └───────────────────────────────┘
```

- **Frontend**: HTML/CSS/JS sem framework, sem bundler. Cada página é um
  `.html` com um `<script type="module">` próprio. Deploy na Vercel como
  site estático puro.
- **"Backend"**: o Postgres do Supabase, com toda a regra de negócio que
  precisa rodar no servidor (cálculo de horários livres, criação de
  agendamento com revalidação, isolamento entre empresas) implementada como
  **funções SQL** (`SECURITY DEFINER`), chamadas via RPC
  (`supabase.rpc(...)`). CRUDs simples (serviços, profissionais, clientes)
  usam a API REST automática do Supabase direto nas tabelas, protegida por
  Row Level Security.
- **Notificações**: Supabase Edge Functions (Deno), acionadas por Database
  Webhook (confirmação) e Cron (lembrete).

## 2. Estrutura de Pastas

```
/
  index.html                 # landing
  empresa.html                # página pública de agendamento (slug via rewrite)
  vercel.json                  # rewrite /:slug -> /empresa.html
  css/styles.css                # design system (sem framework CSS)
  js/
    config.js                    # URL + anon key do projeto Supabase
    supabaseClient.js             # cria o client (import via esm.sh)
    utils.js                       # formatação, helper de DOM (el/clear/...)
    public-booking.js               # wizard da página pública
    admin/
      guard.js                       # exige sessão, resolve a empresa do usuário
      nav.js                          # header/nav do painel
      pending-registration.js          # completa cadastro após confirmação de e-mail
      login.js / register.js
      dashboard.js                     # calendário semanal
      services.js / professionals.js / availability.js / clients.js / settings.js
  admin/
    login.html / register.html / dashboard.html / services.html /
    professionals.html / availability.html / clients.html / settings.html
  supabase/
    schema.sql                  # tabelas + Row Level Security
    functions.sql                 # funções RPC (regra de negócio)
    seed.sql                       # dados de exemplo (catálogo público)
    edge/
      send-notification/index.ts     # e-mail + WhatsApp na confirmação
      send-reminders/index.ts         # lembrete 24h antes (cron)
```

## 3. Modelagem do Banco

Ver `supabase/schema.sql` (fonte da verdade, copiável). Resumo:

| Tabela | Descrição |
|---|---|
| `companies` | Tenant. `slug` único = URL pública. |
| `company_members` | Liga um usuário do Supabase Auth a uma empresa (1 usuário = 1 empresa). `role`: OWNER, STAFF. |
| `company_hours` | Horário comercial exibido na página pública (informativo). |
| `professionals` | Prestador de serviço da empresa. |
| `availability` | Janela de trabalho recorrente por profissional — usada no cálculo real de disponibilidade. |
| `service_categories` | Agrupamento de serviços (ex.: Cabelo, Manicure). |
| `services` | Serviço oferecido (duração, preço, foto, categoria). |
| `service_professionals` | N:N — quais profissionais atendem qual serviço. |
| `clients` | Cliente final da empresa (quem agenda). |
| `bookings` | Agendamento: serviço + profissional + cliente + horário + status. |
| `notification_log` | Histórico de envios (e-mail/WhatsApp) por agendamento. |

## 4. Row Level Security (o coração da segurança multiempresa)

Cada tabela tem RLS habilitado. Duas categorias de dado:

- **Catálogo público** (`service_categories`, `services`, `service_professionals`,
  `company_hours`): policy `using (true)` — qualquer um lê, mas não tem
  coluna sensível.
- **Dado com coluna sensível** (`companies.email/phone`,
  `professionals.email/phone`) ou **privado** (`clients`, `bookings`,
  `availability`): a tabela **não** tem policy pública de leitura — só o
  dono (`company_id = current_company_id()`) lê a linha inteira. O acesso
  público a esses dados passa por **funções `SECURITY DEFINER`**
  (`get_public_company`, `get_public_professionals`, `get_availability`,
  `create_booking`) que retornam só os campos seguros/computados, nunca a
  linha crua.

`current_company_id()` é uma função helper que resolve a empresa do
usuário autenticado via `company_members` — usada em toda policy de
escrita (`company_id = current_company_id()`).

Isso foi validado localmente simulando o Supabase (RLS real, sem bypass de
superusuário — ver seção "Testado" do README): um dono de empresa não
consegue ler/escrever dados de outra empresa, e as rotas públicas não
vazam e-mail/telefone.

## 5. Funções RPC (`supabase/functions.sql`)

| Função | Uso |
|---|---|
| `register_company(name, slug, email)` | Cadastro: cria a empresa + vincula o usuário autenticado como OWNER. |
| `get_public_company(slug)` | Dados públicos da empresa (sem email/phone). |
| `get_public_professionals(slug, service_id?)` | Equipe pública (ou só quem atende um serviço), sem email/phone. |
| `get_availability(slug, service_id, date, professional_id?)` | Horários livres. Sem `professional_id` = "sem preferência" (união de todos os qualificados). |
| `create_booking(...)` | Revalida o horário no servidor e cria o agendamento; "sem preferência" escolhe automaticamente o primeiro profissional livre. |
| `set_availability(professional_id, slots)` | Substitui os horários de um profissional (admin). |
| `set_company_hours(days)` | Substitui o horário comercial exibido na página pública (admin). |
| `dashboard_summary()` | Métricas do painel (hoje, serviços/profissionais ativos, clientes). |

## 6. Fluxo de Funcionamento

**Cliente final (`/{slug}`, via `empresa.html`):**
1. `get_public_company(slug)` → dados da empresa; `services`/`company_hours`
   direto nas tabelas (RLS pública) filtrando por `company_id`.
2. Escolhe um serviço → `get_public_professionals(slug, serviceId)` (mais
   "sem preferência").
3. Escolhe profissional (ou "sem preferência") e uma data no calendário →
   `get_availability(...)`.
4. Escolhe horário, preenche dados → `create_booking(...)` revalida e cria;
   um Database Webhook aciona a Edge Function de notificação.

**Empresa (`/admin/*.html`):**
1. `register.html` → `supabase.auth.signUp()` + `register_company()` RPC
   (ou completa no primeiro login, se o projeto exigir confirmação de
   e-mail — ver `js/admin/pending-registration.js`).
2. `login.html` → `supabase.auth.signInWithPassword()`; sessão do Supabase
   Auth vale para as chamadas seguintes (RLS usa `auth.uid()`).
3. `dashboard.html` → calendário semanal (grade por horário, cor por
   profissional, "sem preferência" mostrado por profissional já atribuído).
4. CRUD de categorias/serviços/profissionais/clientes direto nas tabelas
   (a API REST do Supabase já filtra pela RLS); horários via RPC
   (`set_availability`, `set_company_hours`) para troca atômica.

## 7. Notificações (Edge Functions)

- **`send-notification`**: Database Webhook em `INSERT` de `bookings` →
  e-mail (Resend) + webhook de WhatsApp (n8n/Twilio). Sem as env vars,
  só loga (no-op) — igual ao comportamento anterior.
- **`send-reminders`**: agendada via Supabase Cron, roda periodicamente e
  avisa 24h antes.

Ver README para o passo a passo de deploy (`supabase functions deploy`).

## 8. Funcionalidades Extras (roadmap)

Mesmas quatro prioridades identificadas comparando com o Agendin,
adaptadas pra esta stack:

1. **Serviços adicionais/upsell no agendamento** — checkbox de serviços
   relacionados na tela de confirmação; modelagem: tabela `booking_addons`
   (booking_id, service_id) + soma de duração/preço.
2. **Perguntas customizadas por empresa** — `custom_questions` (company_id,
   label, tipo, obrigatória) + `booking_answers` (booking_id, question_id,
   valor), preenchidas no wizard público antes da confirmação.
3. **Área do cliente** — hoje `clients` é por-empresa; um login de cliente
   final (Supabase Auth) que atravessa empresas exigiria uma tabela de
   conta de cliente separada, linkada a `clients` por telefone/e-mail.
4. **Verificação de WhatsApp por código/captcha** — Edge Function que
   dispara/valida OTP (Twilio Verify, Zenvia) antes de `create_booking`
   liberar a confirmação.

Outras ideias: planos de assinatura (Stripe), bloqueios avulsos de agenda,
tema por empresa aplicado à página pública (`primary_color` já existe),
relatórios, avaliação pós-atendimento.

## 9. Segurança e Performance

- Toda regra que "não pode confiar no cliente" vive no Postgres
  (`SECURITY DEFINER`), não no JavaScript do navegador — o mesmo princípio
  do backend anterior ("revalidar no servidor"), só que o servidor agora é
  a função SQL.
- RLS é a fronteira real de multiempresa — cada policy de escrita usa
  `company_id = current_company_id()`; testado com dois "donos" simulados
  tentando ler/escrever um no dado do outro.
- `js/utils.js#el()` constrói DOM a partir de texto (nunca `innerHTML` com
  dado do usuário) — evita XSS ao renderizar nome de cliente, observações
  etc.
- Rate limiting de agendamento público: o Supabase tem limites de API por
  padrão; para um limite mais fino, dá pra adicionar no `create_booking`
  (ex.: checar quantidade de bookings recentes pelo mesmo telefone).
- Índices em `company_id` e `(professional_id, start_at)` já no schema.

## 10. Sugestão de Deploy

| Componente | Serviço | Custo estimado |
|---|---|---|
| Site estático | Vercel (Hobby) | R$0/mês |
| Banco + Auth + Edge Functions | Supabase (Free/Pro) | R$0–125/mês conforme volume |
| E-mail transacional | Resend (Free tier) | R$0/mês até 3k e-mails |

Praticamente sem custo pra começar — bem mais barato que a stack anterior
(Vercel + Railway/Render + Postgres separado), já que o Supabase junta
banco, auth e funções no mesmo serviço.
