-- ASC Manager — tenants, profiles, RLS, storage, public-site RPCs.
-- Apply on a dedicated Supabase project (staging ≠ production).
-- Auth: invite-only. Disable public sign-ups in the dashboard.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  hours text not null default '',
  whatsapp text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  modules_store boolean not null default false,
  modules_calendar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  role text not null check (role in ('operator', 'client')),
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_tenant check (
    (role = 'operator' and tenant_id is null)
    or (role = 'client' and tenant_id is not null)
  )
);

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'operator'
  );
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where user_id = auth.uid();
$$;

revoke all on function public.is_operator() from public;
revoke all on function public.current_tenant_id() from public;
grant execute on function public.is_operator() to authenticated;
grant execute on function public.current_tenant_id() to authenticated;

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  host text not null,
  url text not null,
  kind text not null check (kind in ('public', 'admin')),
  created_at timestamptz not null default now()
);

create unique index sites_host_lower_idx on public.sites (lower(host));

create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  kind text not null check (kind in ('http', 'ssl')),
  label text not null,
  status text not null default 'unchecked' check (status in ('up', 'down', 'unchecked')),
  last_checked_at timestamptz,
  uptime30 numeric
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  opened_at timestamptz not null default now()
);

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item text not null,
  type text not null check (type in ('domain', 'hosting', 'ssl')),
  expires_at timestamptz not null
);

create table public.visitor_days (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  date date not null,
  views integer not null default 0,
  bots integer not null default 0,
  primary key (site_id, date)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  author_name text not null
);

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  group_name text not null,
  key text not null,
  label text not null,
  kind text not null check (kind in ('image', 'url', 'text')),
  value text not null default '',
  hint text not null default '',
  max_len integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (site_id, key)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  price_zar numeric not null default 0,
  stock integer not null default 0,
  live boolean not null default false,
  photo_path text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  place text not null default '',
  notes text not null default ''
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  path text not null,
  added_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ref text not null,
  item text not null,
  amount_zar numeric not null,
  status text not null default 'due' check (status in ('due', 'paid')),
  due_at timestamptz not null
);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  summary text not null,
  at timestamptz not null default now(),
  actor text not null
);

create index tenants_status_idx on public.tenants (status);
create index profiles_tenant_idx on public.profiles (tenant_id);
create index sites_tenant_idx on public.sites (tenant_id);
create index monitors_site_idx on public.monitors (site_id);
create index incidents_site_idx on public.incidents (site_id);
create index renewals_tenant_idx on public.renewals (tenant_id, expires_at);
create index requests_tenant_idx on public.requests (tenant_id, status);
create index content_blocks_site_idx on public.content_blocks (site_id);
create index products_tenant_idx on public.products (tenant_id);
create index calendar_events_tenant_idx on public.calendar_events (tenant_id, starts_at);
create index enquiries_tenant_idx on public.enquiries (tenant_id, status);
create index media_tenant_idx on public.media (tenant_id);
create index invoices_tenant_idx on public.invoices (tenant_id, status);
create index change_log_tenant_idx on public.change_log (tenant_id, at desc);

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger content_blocks_updated_at
  before update on public.content_blocks
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth → profile (invite metadata only — no public self-signup)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  tid uuid;
  n text;
begin
  r := new.raw_user_meta_data->>'role';
  if r is null or r not in ('operator', 'client') then
    raise exception 'user must be invited with a role';
  end if;
  n := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  if r = 'client' then
    begin
      tid := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;
    exception when others then
      raise exception 'client invite needs tenant_id';
    end;
    if tid is null then
      raise exception 'client invite needs tenant_id';
    end if;
  else
    tid := null;
  end if;
  insert into public.profiles (user_id, tenant_id, role, name, email)
  values (new.id, tid, r, n, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
  new.status := old.status;
  new.name := old.name;
  return new;
end;
$$;

create trigger tenants_protect_staff_fields
  before update on public.tenants
  for each row execute procedure public.protect_tenant_staff_fields();

create or replace function public.protect_profile_staff_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_operator() then
    return new;
  end if;
  new.role := old.role;
  new.tenant_id := old.tenant_id;
  new.email := old.email;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger profiles_protect_staff_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_staff_fields();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.monitors enable row level security;
alter table public.incidents enable row level security;
alter table public.renewals enable row level security;
alter table public.visitor_days enable row level security;
alter table public.requests enable row level security;
alter table public.content_blocks enable row level security;
alter table public.products enable row level security;
alter table public.calendar_events enable row level security;
alter table public.enquiries enable row level security;
alter table public.media enable row level security;
alter table public.invoices enable row level security;
alter table public.change_log enable row level security;

alter table public.tenants force row level security;
alter table public.profiles force row level security;
alter table public.sites force row level security;
alter table public.monitors force row level security;
alter table public.incidents force row level security;
alter table public.renewals force row level security;
alter table public.visitor_days force row level security;
alter table public.requests force row level security;
alter table public.content_blocks force row level security;
alter table public.products force row level security;
alter table public.calendar_events force row level security;
alter table public.enquiries force row level security;
alter table public.media force row level security;
alter table public.invoices force row level security;
alter table public.change_log force row level security;

-- tenants
create policy tenants_select on public.tenants
  for select to authenticated
  using (public.is_operator() or id = public.current_tenant_id());
create policy tenants_insert on public.tenants
  for insert to authenticated
  with check (public.is_operator());
create policy tenants_update on public.tenants
  for update to authenticated
  using (public.is_operator() or id = public.current_tenant_id())
  with check (public.is_operator() or id = public.current_tenant_id());
create policy tenants_delete on public.tenants
  for delete to authenticated
  using (public.is_operator());

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_operator());
create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_operator())
  with check (user_id = auth.uid() or public.is_operator());

-- sites: staff write, both read own
create policy sites_select on public.sites
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy sites_insert on public.sites
  for insert to authenticated
  with check (public.is_operator());
create policy sites_update on public.sites
  for update to authenticated
  using (public.is_operator())
  with check (public.is_operator());
create policy sites_delete on public.sites
  for delete to authenticated
  using (public.is_operator());

-- monitors / incidents / visitor_days: staff write, both read
create policy monitors_select on public.monitors
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy monitors_write on public.monitors
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

create policy incidents_select on public.incidents
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy incidents_write on public.incidents
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

create policy visitor_days_select on public.visitor_days
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy visitor_days_write on public.visitor_days
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- renewals / invoices: clients read, staff write
create policy renewals_select on public.renewals
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy renewals_write on public.renewals
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

create policy invoices_select on public.invoices
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (public.is_operator());
create policy invoices_update on public.invoices
  for update to authenticated
  using (public.is_operator())
  with check (public.is_operator());
create policy invoices_delete on public.invoices
  for delete to authenticated
  using (public.is_operator());

-- requests: clients open them; staff mark done
create policy requests_select on public.requests
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy requests_insert on public.requests
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy requests_update on public.requests
  for update to authenticated
  using (public.is_operator())
  with check (public.is_operator());
create policy requests_delete on public.requests
  for delete to authenticated
  using (public.is_operator());

-- enquiries: public form uses RPC; clients update status
create policy enquiries_select on public.enquiries
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy enquiries_update on public.enquiries
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy enquiries_delete on public.enquiries
  for delete to authenticated
  using (public.is_operator());

-- client-editable tenant data
create policy content_blocks_select on public.content_blocks
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_blocks_insert on public.content_blocks
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_blocks_update on public.content_blocks
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy content_blocks_delete on public.content_blocks
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

create policy products_select on public.products
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy products_insert on public.products
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy products_update on public.products
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy products_delete on public.products
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy calendar_events_insert on public.calendar_events
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy calendar_events_delete on public.calendar_events
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

create policy media_select on public.media
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy media_insert on public.media
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy media_update on public.media
  for update to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id())
  with check (public.is_operator() or tenant_id = public.current_tenant_id());
create policy media_delete on public.media
  for delete to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());

create policy change_log_select on public.change_log
  for select to authenticated
  using (public.is_operator() or tenant_id = public.current_tenant_id());
create policy change_log_insert on public.change_log
  for insert to authenticated
  with check (public.is_operator() or tenant_id = public.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_bucket_select on storage.objects
  for select
  using (bucket_id = 'media');

create policy media_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (
      public.is_operator()
      or (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
  );

create policy media_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (
      public.is_operator()
      or (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
  );

create policy media_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (
      public.is_operator()
      or (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Public site contract (anon RPC — host is the key, not a login)
-- ---------------------------------------------------------------------------

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
        'calendar', t.modules_calendar
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

create or replace function public.submit_public_enquiry(
  p_host text,
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sites%rowtype;
  new_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2
     or length(trim(coalesce(p_email, ''))) < 5
     or length(trim(coalesce(p_message, ''))) < 2
     or length(p_name) > 200
     or length(p_email) > 200
     or length(coalesce(p_phone, '')) > 40
     or length(p_message) > 4000 then
    raise exception 'invalid enquiry';
  end if;
  select * into s
  from public.sites
  where lower(host) = lower(trim(p_host))
    and kind = 'public'
  limit 1;
  if not found then
    raise exception 'unknown site';
  end if;
  insert into public.enquiries (tenant_id, name, email, phone, message)
  values (
    s.tenant_id,
    trim(p_name),
    trim(p_email),
    trim(coalesce(p_phone, '')),
    trim(p_message)
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.get_public_site(text) from public;
revoke all on function public.submit_public_enquiry(text, text, text, text, text) from public;
grant execute on function public.get_public_site(text) to anon, authenticated;
grant execute on function public.submit_public_enquiry(text, text, text, text, text) to anon, authenticated;
