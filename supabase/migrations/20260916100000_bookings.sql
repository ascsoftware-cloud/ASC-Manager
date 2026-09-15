-- Bookings module: staff toggle on the tenant, client-only rows.

alter table public.tenants
  add column if not exists modules_bookings boolean not null default false;

create or replace function public.protect_tenant_staff_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_operator() then
    return new;
  end if;
  new.modules_store := old.modules_store;
  new.modules_calendar := old.modules_calendar;
  new.modules_bookings := old.modules_bookings;
  new.status := old.status;
  new.name := old.name;
  return new;
end;
$$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  guest_name text not null,
  email text not null default '',
  phone text not null default '',
  starts_at timestamptz not null,
  notes text not null default '',
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_tenant_idx on public.bookings (tenant_id, starts_at);

alter table public.bookings enable row level security;
alter table public.bookings force row level security;

drop policy if exists bookings_select on public.bookings;
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_update on public.bookings;
drop policy if exists bookings_delete on public.bookings;

create policy bookings_select on public.bookings
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy bookings_insert on public.bookings
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy bookings_update on public.bookings
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy bookings_delete on public.bookings
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;

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
  return jsonb_build_object(
    'tenant', jsonb_build_object(
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
        'bookings', t.modules_bookings
      )
    ),
    'site', jsonb_build_object(
      'host', s.host,
      'url', s.url
    ),
    'blocks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'group', cb.group_name,
          'key', cb.key,
          'kind', cb.kind,
          'value', cb.value,
          'label', cb.label
        )
        order by cb.group_name, cb.key
      )
      from public.content_blocks cb
      where cb.site_id = s.id
    ), '[]'::jsonb),
    'products', case
      when t.modules_store then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', p.name,
            'priceZar', p.price_zar,
            'stock', p.stock,
            'photoPath', p.photo_path,
            'note', p.note
          )
          order by p.name
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
