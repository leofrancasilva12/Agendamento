-- Dados de exemplo — roda depois de schema.sql e functions.sql.
-- Só popula o catálogo público (empresa, categorias, serviços, profissionais,
-- horários). A conta de admin real é criada pelo fluxo de cadastro do site
-- (admin/register.html), que vincula um usuário do Supabase Auth a uma
-- empresa — por isso este seed não cria nenhum "dono" para salao-exemplo.

insert into public.companies (name, slug, email, phone, primary_color, address_line, instagram_url, facebook_url, whatsapp_number)
values (
  'Salão Exemplo',
  'salao-exemplo',
  'contato@salaoexemplo.com.br',
  '11999990000',
  '#2563eb',
  'Praça da Sé, 10 - Sé - São Paulo - SP - 01001-000',
  'https://instagram.com/salaoexemplo',
  'https://facebook.com/salaoexemplo',
  '11999990000'
);

insert into public.company_hours (company_id, weekday, closed, start_time, end_time)
select id, weekday, closed, start_time, end_time
from public.companies, (values
  (0, true, null::time, null::time),
  (1, false, '08:00'::time, '18:00'::time),
  (2, false, '08:00'::time, '18:00'::time),
  (3, false, '08:00'::time, '18:00'::time),
  (4, false, '08:00'::time, '18:00'::time),
  (5, false, '08:00'::time, '18:00'::time),
  (6, false, '08:00'::time, '14:00'::time)
) as h(weekday, closed, start_time, end_time)
where slug = 'salao-exemplo';

insert into public.service_categories (company_id, name, "order")
select id, 'Cabelo', 0 from public.companies where slug = 'salao-exemplo';
insert into public.service_categories (company_id, name, "order")
select id, 'Manicure e Pedicure', 1 from public.companies where slug = 'salao-exemplo';

insert into public.professionals (company_id, name, email)
select id, 'Ana Souza', 'ana@salaoexemplo.com.br' from public.companies where slug = 'salao-exemplo';
insert into public.professionals (company_id, name, email)
select id, 'Bruno Lima', 'bruno@salaoexemplo.com.br' from public.companies where slug = 'salao-exemplo';

insert into public.availability (professional_id, weekday, start_time, end_time)
select p.id, d.weekday, '09:00'::time, '18:00'::time
from public.professionals p, (values (1), (2), (3), (4), (5)) as d(weekday)
where p.name = 'Ana Souza' and p.company_id = (select id from public.companies where slug = 'salao-exemplo');

insert into public.availability (professional_id, weekday, start_time, end_time)
select p.id, d.weekday, '10:00'::time, '19:00'::time
from public.professionals p, (values (2), (3), (4), (5), (6)) as d(weekday)
where p.name = 'Bruno Lima' and p.company_id = (select id from public.companies where slug = 'salao-exemplo');

insert into public.services (company_id, category_id, name, description, duration_minutes, price_cents)
select c.id, cat.id, 'Corte de Cabelo', 'Corte feminino ou masculino', 45, 8000
from public.companies c join public.service_categories cat on cat.company_id = c.id and cat.name = 'Cabelo'
where c.slug = 'salao-exemplo';

insert into public.services (company_id, category_id, name, description, duration_minutes, price_cents)
select c.id, cat.id, 'Manicure', 'Cuticulagem + esmaltação comum + finalização.', 30, 4500
from public.companies c join public.service_categories cat on cat.company_id = c.id and cat.name = 'Manicure e Pedicure'
where c.slug = 'salao-exemplo';

insert into public.services (company_id, category_id, name, description, duration_minutes, price_cents)
select c.id, cat.id, 'Esmaltação em Gel', 'Esmalte em gel com cura na cabine, brilho intenso e maior durabilidade.', 60, 11000
from public.companies c join public.service_categories cat on cat.company_id = c.id and cat.name = 'Manicure e Pedicure'
where c.slug = 'salao-exemplo';

insert into public.service_professionals (service_id, professional_id)
select s.id, p.id
from public.services s
join public.professionals p on p.company_id = s.company_id
where s.company_id = (select id from public.companies where slug = 'salao-exemplo')
  and (
    (s.name = 'Corte de Cabelo') -- Ana e Bruno
    or (s.name in ('Manicure', 'Esmaltação em Gel') and p.name = 'Ana Souza')
  );
