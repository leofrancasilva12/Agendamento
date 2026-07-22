# Agendamento

Sistema de agendamento online multiempresa: cada negócio tem um painel
administrativo e uma página pública de agendamento (`/{slug}`) para os
clientes marcarem horários sozinhos.

Ver a arquitetura completa em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

- **apps/api** — NestJS + Prisma + PostgreSQL (API REST em `/api/v1`)
- **apps/web** — Next.js 14 (App Router) + Tailwind CSS

## Como rodar localmente

### 1. Banco de dados

```bash
docker compose up -d
```

Isso sobe um PostgreSQL local em `localhost:5432` (usuário/senha/banco:
`agendamento`).

### 2. Backend (API)

```bash
cd apps/api
cp .env.example .env
npm install
npm run prisma:migrate   # cria as tabelas
npm run seed              # cria uma empresa de exemplo
npm run start:dev         # http://localhost:3333/api/v1
```

O seed cria a empresa `salao-exemplo` com login admin:
`owner@salaoexemplo.com.br` / `senha123`.

### 3. Frontend (Web)

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

- Página pública de agendamento: `http://localhost:3000/salao-exemplo`
- Painel admin: `http://localhost:3000/admin/login`

> Instalando a partir da raiz do monorepo (`npm install` na raiz) também
> funciona, graças aos npm workspaces — os passos acima podem ser rodados
> como `npm run dev:api` / `npm run dev:web` a partir da raiz.

## Notificações (e-mail / WhatsApp)

- **E-mail**: configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM` no `.env` da API. Sem SMTP configurado, os e-mails são apenas
  logados no console (não quebra o fluxo de agendamento).
- **WhatsApp**: configure `N8N_BOOKING_CREATED_WEBHOOK_URL` e
  `N8N_BOOKING_REMINDER_WEBHOOK_URL` apontando para fluxos n8n que recebem o
  payload do agendamento e disparam a mensagem (WhatsApp Business API,
  Twilio, etc.). Sem webhook configurado, o envio é apenas logado.

## Testado

- Build de produção de `apps/api` (`nest build`) e `apps/web` (`next build`)
  sem erros.
- Fluxo completo via API: criação de empresa/serviço/profissional (seed),
  cálculo de horários disponíveis, criação de agendamento público, login
  admin e listagem de agendamentos por empresa.
- Fluxo completo no navegador (Playwright): wizard público de agendamento
  (serviço → profissional → data/hora) e painel admin (login → dashboard →
  serviços).

## Roadmap

Ver seção "Funcionalidades Extras" em [`ARCHITECTURE.md`](./ARCHITECTURE.md).
