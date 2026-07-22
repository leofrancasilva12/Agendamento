-- Agendamento — schema Supabase (Postgres + RLS)
-- Rode este arquivo no SQL editor do Supabase (ou via `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  email text not null,
  phone text,
  logo_url text,
  cover_image_url text,
  primary_color text not null default '#2563eb',
  timezone text not null default 'America/Sao_Paulo',
  address_line text,
  instagram_url text,
  facebook_url text,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Liga um usuário do Supabase Auth a uma empresa. Um usuário pertence a
-- exatamente uma empresa (equivalente ao User.companyId do modelo anterior).
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'OWNER' check (role in ('OWNER', 'STAFF')),
  created_at timestamptz not null default now()
);

create index company_members_company_id_idx on public.company_members(company_id);

-- Helper: id da empresa do usuário autenticado (usado nas policies).
create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.company_members where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------
-- company_hours (horário comercial exibido na página pública)
-- ---------------------------------------------------------------------
create table public.company_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  closed boolean not null default false,
  start_time time,
  end_time time,
  unique (company_id, weekday)
);

-- ---------------------------------------------------------------------
-- professionals
-- ---------------------------------------------------------------------
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index professionals_company_id_idx on public.professionals(company_id);

-- Horário de trabalho recorrente por profissional — usado no cálculo real
-- de disponibilidade (diferente do company_hours, que é só informativo).
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

create index availability_professional_weekday_idx on public.availability(professional_id, weekday);

-- ---------------------------------------------------------------------
-- service_categories / services
-- ---------------------------------------------------------------------
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create index service_categories_company_id_idx on public.service_categories(company_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  duration_minutes int not null check (duration_minutes >= 5),
  price_cents int not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_company_id_idx on public.services(company_id);
create index services_category_id_idx on public.services(category_id);

create table public.service_professionals (
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  primary key (service_id, professional_id)
);

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, phone)
);

create index clients_company_id_idx on public.clients(company_id);

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_id uuid not null references public.services(id),
  professional_id uuid not null references public.professionals(id),
  client_id uuid not null references public.clients(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW')),
  notes text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_company_id_idx on public.bookings(company_id);
create index bookings_professional_start_idx on public.bookings(professional_id, start_at);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  channel text not null check (channel in ('EMAIL', 'WHATSAPP')),
  status text not null check (status in ('SENT', 'FAILED', 'SKIPPED')),
  error text,
  sent_at timestamptz not null default now()
);

create index notification_log_booking_id_idx on public.notification_log(booking_id);

-- =======================================================================
-- Row Level Security
-- =======================================================================

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_hours enable row level security;
alter table public.professionals enable row level security;
alter table public.availability enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_professionals enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.notification_log enable row level security;

-- companies: a linha completa tem colunas sensíveis (email de login,
-- phone interno) — a leitura pública NÃO passa por policy direta na
-- tabela, só pela função get_public_company (retorna só os campos
-- seguros: nome, logo, cor, endereço, redes sociais...). Aqui só o dono
-- lê/edita a linha completa.
create policy "companies_owner_read" on public.companies
  for select using (id = public.current_company_id());
create policy "companies_owner_update" on public.companies
  for update using (id = public.current_company_id());

-- company_members: cada usuário só enxerga o próprio vínculo.
create policy "company_members_self_read" on public.company_members
  for select using (user_id = auth.uid());

-- company_hours: leitura pública (exibido na página); escrita só do dono.
create policy "company_hours_public_read" on public.company_hours
  for select using (true);
create policy "company_hours_owner_write" on public.company_hours
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- professionals: a tabela tem colunas sensíveis (email, phone), então a
-- leitura pública NÃO passa por policy direta na tabela — só pela função
-- get_public_professionals (retorna apenas id/name/avatar_url). Aqui só o
-- dono pode ler a linha completa.
create policy "professionals_owner_read" on public.professionals
  for select using (company_id = public.current_company_id());
create policy "professionals_owner_write" on public.professionals
  for insert with check (company_id = public.current_company_id());
create policy "professionals_owner_update" on public.professionals
  for update using (company_id = public.current_company_id());
create policy "professionals_owner_delete" on public.professionals
  for delete using (company_id = public.current_company_id());

-- availability: só o dono lê/gerencia (o cálculo de horários livres para o
-- público passa pela função get_availability, que roda com privilégio).
create policy "availability_owner_all" on public.availability
  for all using (
    professional_id in (select id from public.professionals where company_id = public.current_company_id())
  )
  with check (
    professional_id in (select id from public.professionals where company_id = public.current_company_id())
  );

-- service_categories: leitura pública; escrita só do dono.
create policy "service_categories_public_read" on public.service_categories
  for select using (true);
create policy "service_categories_owner_write" on public.service_categories
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- services: leitura pública só dos ativos; dono vê e gerencia todos.
create policy "services_public_read" on public.services
  for select using (active or company_id = public.current_company_id());
create policy "services_owner_write" on public.services
  for insert with check (company_id = public.current_company_id());
create policy "services_owner_update" on public.services
  for update using (company_id = public.current_company_id());
create policy "services_owner_delete" on public.services
  for delete using (company_id = public.current_company_id());

-- service_professionals: leitura pública (só liga IDs, sem dado sensível).
create policy "service_professionals_public_read" on public.service_professionals
  for select using (true);
create policy "service_professionals_owner_write" on public.service_professionals
  for all using (
    service_id in (select id from public.services where company_id = public.current_company_id())
  )
  with check (
    service_id in (select id from public.services where company_id = public.current_company_id())
  );

-- clients: dado sensível (telefone/e-mail) — só o dono lê/gerencia.
-- A criação de cliente pelo agendamento público passa pela função
-- create_booking (privilégio elevado), nunca por insert direto.
create policy "clients_owner_all" on public.clients
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- bookings: só o dono lê. Criação pública passa pela função create_booking;
-- atualização de status é feita pelo dono.
create policy "bookings_owner_read" on public.bookings
  for select using (company_id = public.current_company_id());
create policy "bookings_owner_update" on public.bookings
  for update using (company_id = public.current_company_id());

-- notification_log: só o dono lê (via join implícito de booking_id).
create policy "notification_log_owner_read" on public.notification_log
  for select using (
    booking_id in (select id from public.bookings where company_id = public.current_company_id())
  );
