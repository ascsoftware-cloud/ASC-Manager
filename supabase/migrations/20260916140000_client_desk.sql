-- Client desk: shop order, weekly advert, homepage sections.

alter table public.products
  add column if not exists sort_order integer not null default 0;
alter table public.products
  add column if not exists featured boolean not null default false;
alter table public.products
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

create table if not exists public.content_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  key text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create index if not exists content_sections_tenant_idx on public.content_sections (tenant_id, sort_order);

drop trigger if exists content_sections_updated_at on public.content_sections;
create trigger content_sections_updated_at
  before update on public.content_sections
  for each row execute procedure public.set_updated_at();

create table if not exists public.weekly_adverts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'expired')),
  photo_path text not null default '',
  headline text not null default '',
  body text not null default '',
  link_type text not null default 'none' check (link_type in ('none', 'product', 'event', 'url')),
  link_id text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists weekly_adverts_tenant_idx on public.weekly_adverts (tenant_id, starts_on desc);

drop trigger if exists weekly_adverts_updated_at on public.weekly_adverts;
create trigger weekly_adverts_updated_at
  before update on public.weekly_adverts
  for each row execute procedure public.set_updated_at();

alter table public.content_sections enable row level security;
alter table public.content_sections force row level security;
alter table public.weekly_adverts enable row level security;
alter table public.weekly_adverts force row level security;

drop policy if exists content_sections_select on public.content_sections;
drop policy if exists content_sections_insert on public.content_sections;
drop policy if exists content_sections_update on public.content_sections;
drop policy if exists content_sections_delete on public.content_sections;
create policy content_sections_select on public.content_sections
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_sections_insert on public.content_sections
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_sections_update on public.content_sections
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_sections_delete on public.content_sections
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

drop policy if exists weekly_adverts_select on public.weekly_adverts;
drop policy if exists weekly_adverts_insert on public.weekly_adverts;
drop policy if exists weekly_adverts_update on public.weekly_adverts;
drop policy if exists weekly_adverts_delete on public.weekly_adverts;
create policy weekly_adverts_select on public.weekly_adverts
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy weekly_adverts_insert on public.weekly_adverts
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy weekly_adverts_update on public.weekly_adverts
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy weekly_adverts_delete on public.weekly_adverts
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

grant select, insert, update, delete on public.content_sections to authenticated;
grant all on public.content_sections to service_role;
grant select, insert, update, delete on public.weekly_adverts to authenticated;
grant all on public.weekly_adverts to service_role;

create or replace function public.get_public_site(p_host text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.sites%rowtype;
  t public.tenants%rowtype;
  advert jsonb;
begin
  if p_host is null or length(trim(p_host)) = 0 then
    return null;
  end if;
  select * into s
  from public.sites
  where lower(host) = lower(trim(p_host))
    and kind = 'public'
  limit 1;
  if not found then
    return null;
  end if;
  select * into t
  from public.tenants
  where id = s.tenant_id
    and status = 'active';
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id', a.id,
    'startsOn', a.starts_on,
    'endsOn', a.ends_on,
    'headline', a.headline,
    'body', a.body,
    'photoPath', a.photo_path,
    'linkType', a.link_type,
    'linkId', a.link_id
  )
  into advert
  from public.weekly_adverts a
  where a.tenant_id = t.id
    and a.status = 'live'
    and a.starts_on <= current_date
    and a.ends_on >= current_date
  order by a.updated_at desc
  limit 1;

  return jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'city', t.city,
      'phone', t.phone,
      'email', t.email,
      'address', t.address,
      'hours', t.hours,
      'whatsapp', t.whatsapp,
      'modules', jsonb_build_object(
        'store', t.modules_store,
        'calendar', t.modules_calendar,
        'bookings', coalesce(t.modules_bookings, false)
      )
    ),
    'site', jsonb_build_object(
      'host', s.host,
      'url', s.url
    ),
    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key', cs.key,
          'sortOrder', cs.sort_order,
          'visible', cs.visible,
          'payload', cs.payload
        )
        order by cs.sort_order
      )
      from public.content_sections cs
      where cs.tenant_id = t.id
        and cs.visible = true
    ), '[]'::jsonb),
    'advert', advert,
    'products', case
      when t.modules_store then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'priceZar', p.price_zar,
            'stock', p.stock,
            'photoPath', p.photo_path,
            'note', p.note,
            'featured', p.featured,
            'sortOrder', p.sort_order
          )
          order by p.sort_order, p.name
        )
        from public.products p
        where p.tenant_id = t.id
          and p.live = true
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'events', case
      when t.modules_calendar then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'startsAt', e.starts_at,
            'endsAt', e.ends_at,
            'place', e.place,
            'notes', e.notes
          )
          order by e.starts_at
        )
        from public.calendar_events e
        where e.tenant_id = t.id
          and e.starts_at >= (now() - interval '12 hours')
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  );
end;
$$;
