-- Agendamento — funções de negócio (RPC) do Supabase.
-- Rode depois de schema.sql.

-- ---------------------------------------------------------------------
-- register_company: cria a empresa + vincula o usuário autenticado como
-- OWNER. Chamado logo após supabase.auth.signUp() no fluxo de cadastro.
-- ---------------------------------------------------------------------
create or replace function public.register_company(
  p_company_name text,
  p_slug text,
  p_email text
) returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.company_members where user_id = auth.uid()) then
    raise exception 'user already has a company';
  end if;

  insert into public.companies (name, slug, email)
  values (p_company_name, p_slug, p_email)
  returning * into v_company;

  insert into public.company_members (company_id, user_id, role)
  values (v_company.id, auth.uid(), 'OWNER');

  return v_company;
end;
$$;

grant execute on function public.register_company(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- get_public_company / get_public_professionals: leitura pública com
-- apenas colunas seguras (companies.email/phone e professionals.email/
-- phone NÃO são expostos — a tabela em si só é legível pelo dono via RLS).
-- ---------------------------------------------------------------------
create or replace function public.get_public_company(p_slug text)
returns table(
  id uuid,
  name text,
  slug text,
  logo_url text,
  cover_image_url text,
  primary_color text,
  timezone text,
  address_line text,
  instagram_url text,
  facebook_url text,
  whatsapp_number text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id, c.name, c.slug, c.logo_url, c.cover_image_url, c.primary_color,
    c.timezone, c.address_line, c.instagram_url, c.facebook_url, c.whatsapp_number
  from public.companies c
  where c.slug = p_slug;
$$;

grant execute on function public.get_public_company(text) to anon, authenticated;

create or replace function public.get_public_professionals(p_slug text, p_service_id uuid default null)
returns table(id uuid, name text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select distinct p.id, p.name, p.avatar_url
  from public.professionals p
  join public.companies c on c.id = p.company_id
  left join public.service_professionals sp on sp.professional_id = p.id and sp.service_id = p_service_id
  where c.slug = p_slug
    and p.active = true
    and (p_service_id is null or sp.service_id is not null);
$$;

grant execute on function public.get_public_professionals(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- get_availability: horários livres (HH:MM) de um profissional — ou, se
-- p_professional_id for nulo, a união dos horários livres de todos os
-- profissionais qualificados para o serviço ("sem preferência").
-- ---------------------------------------------------------------------
create or replace function public.get_availability(
  p_slug text,
  p_service_id uuid,
  p_date date,
  p_professional_id uuid default null
) returns table(slot_time text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_duration int;
  v_weekday int;
begin
  select id into v_company_id from public.companies where slug = p_slug;
  if v_company_id is null then
    raise exception 'company not found';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and company_id = v_company_id and active = true;
  if v_duration is null then
    raise exception 'service not found';
  end if;

  v_weekday := extract(dow from p_date)::int;

  return query
  with candidate_professionals as (
    select p.id
    from public.professionals p
    where p.company_id = v_company_id
      and p.active = true
      and (
        p_professional_id = p.id
        or (
          p_professional_id is null
          and exists (
            select 1 from public.service_professionals sp
            where sp.service_id = p_service_id and sp.professional_id = p.id
          )
        )
      )
  ),
  windows as (
    select a.professional_id, a.start_time, a.end_time
    from public.availability a
    join candidate_professionals cp on cp.id = a.professional_id
    where a.weekday = v_weekday
  ),
  candidate_slots as (
    select
      w.professional_id,
      gs::time as slot_start
    from windows w
    cross join lateral generate_series(
      (p_date + w.start_time)::timestamp,
      (p_date + w.end_time)::timestamp - (v_duration || ' minutes')::interval,
      interval '15 minutes'
    ) as gs
  ),
  free_slots as (
    select distinct cs.slot_start
    from candidate_slots cs
    where (p_date > current_date or (p_date + cs.slot_start) > now())
      and not exists (
        select 1 from public.bookings b
        where b.professional_id = cs.professional_id
          and b.status in ('PENDING', 'CONFIRMED')
          and (p_date + cs.slot_start, p_date + cs.slot_start + (v_duration || ' minutes')::interval)
              overlaps (b.start_at, b.end_at)
      )
  )
  select to_char(slot_start, 'HH24:MI') from free_slots order by 1;
end;
$$;

grant execute on function public.get_availability(text, uuid, date, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- create_booking: revalida o horário no servidor (nunca confia no horário
-- enviado pelo cliente) e cria o agendamento. "Sem preferência" =
-- p_professional_id nulo → escolhe o primeiro profissional qualificado
-- que ainda esteja livre.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_slug text,
  p_service_id uuid,
  p_date date,
  p_time text,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null,
  p_professional_id uuid default null
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_duration int;
  v_professional_id uuid;
  v_client_id uuid;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_booking public.bookings;
  v_available boolean;
begin
  select id into v_company_id from public.companies where slug = p_slug;
  if v_company_id is null then
    raise exception 'company not found';
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and company_id = v_company_id and active = true;
  if v_duration is null then
    raise exception 'service not found';
  end if;

  if p_professional_id is not null then
    if not exists (
      select 1 from public.professionals
      where id = p_professional_id and company_id = v_company_id and active = true
    ) then
      raise exception 'professional not found';
    end if;

    select exists (
      select 1 from public.get_availability(p_slug, p_service_id, p_date, p_professional_id) g
      where g.slot_time = p_time
    ) into v_available;

    if not v_available then
      raise exception 'slot not available';
    end if;
    v_professional_id := p_professional_id;
  else
    select p.id into v_professional_id
    from public.professionals p
    join public.service_professionals sp
      on sp.professional_id = p.id and sp.service_id = p_service_id
    where p.company_id = v_company_id
      and p.active = true
      and exists (
        select 1 from public.get_availability(p_slug, p_service_id, p_date, p.id) g
        where g.slot_time = p_time
      )
    limit 1;

    if v_professional_id is null then
      raise exception 'slot not available';
    end if;
  end if;

  v_start_at := (p_date::text || ' ' || p_time || ':00')::timestamp;
  v_end_at := v_start_at + (v_duration || ' minutes')::interval;

  insert into public.clients (company_id, name, phone, email)
  values (v_company_id, p_client_name, p_client_phone, p_client_email)
  on conflict (company_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.clients.email)
  returning id into v_client_id;

  insert into public.bookings
    (company_id, service_id, professional_id, client_id, start_at, end_at, notes, status)
  values
    (v_company_id, p_service_id, v_professional_id, v_client_id, v_start_at, v_end_at, p_notes, 'CONFIRMED')
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.create_booking(text, uuid, date, text, text, text, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- set_availability: substitui (atomicamente) os horários de trabalho de
-- um profissional. p_slots: [{"weekday":1,"start_time":"09:00","end_time":"18:00"}, ...]
-- ---------------------------------------------------------------------
create or replace function public.set_availability(
  p_professional_id uuid,
  p_slots jsonb
) returns setof public.availability
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.professionals
    where id = p_professional_id and company_id = public.current_company_id()
  ) then
    raise exception 'professional not found';
  end if;

  delete from public.availability where professional_id = p_professional_id;

  insert into public.availability (professional_id, weekday, start_time, end_time)
  select
    p_professional_id,
    (slot->>'weekday')::int,
    (slot->>'start_time')::time,
    (slot->>'end_time')::time
  from jsonb_array_elements(p_slots) as slot;

  return query select * from public.availability where professional_id = p_professional_id order by weekday;
end;
$$;

grant execute on function public.set_availability(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- set_company_hours: substitui (atomicamente) o horário comercial exibido
-- na página pública. p_days: [{"weekday":0,"closed":true}, {"weekday":1,"closed":false,"start_time":"08:00","end_time":"18:00"}, ...]
-- ---------------------------------------------------------------------
create or replace function public.set_company_hours(
  p_days jsonb
) returns setof public.company_hours
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
begin
  if v_company_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.company_hours where company_id = v_company_id;

  insert into public.company_hours (company_id, weekday, closed, start_time, end_time)
  select
    v_company_id,
    (day->>'weekday')::int,
    coalesce((day->>'closed')::boolean, false),
    nullif(day->>'start_time', '')::time,
    nullif(day->>'end_time', '')::time
  from jsonb_array_elements(p_days) as day;

  return query select * from public.company_hours where company_id = v_company_id order by weekday;
end;
$$;

grant execute on function public.set_company_hours(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- dashboard_summary: métricas do painel admin.
-- ---------------------------------------------------------------------
create or replace function public.dashboard_summary()
returns table(
  today_count int,
  active_services int,
  active_professionals int,
  total_clients int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
begin
  if v_company_id is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    (select count(*)::int from public.bookings
      where company_id = v_company_id
        and status in ('PENDING', 'CONFIRMED')
        and start_at >= date_trunc('day', now())
        and start_at < date_trunc('day', now()) + interval '1 day'),
    (select count(*)::int from public.services where company_id = v_company_id and active = true),
    (select count(*)::int from public.professionals where company_id = v_company_id and active = true),
    (select count(*)::int from public.clients where company_id = v_company_id);
end;
$$;

grant execute on function public.dashboard_summary() to authenticated;
