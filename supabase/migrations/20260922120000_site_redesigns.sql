-- Site redesigns: the ASC-built redesign link for a site, shown next to the
-- client's current live URL. Staff only — deliberately not readable by the
-- client role, unlike every other per-site table (sites/monitors/incidents
-- all use "both read own"). A client should not see our redesign of their
-- own site until we choose to show them, so this is is_operator()-only on
-- every policy, with no current_tenant_id() fallback.

create table if not exists public.site_redesigns (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade unique,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  redesign_url text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists site_redesigns_tenant_idx on public.site_redesigns (tenant_id);

drop trigger if exists site_redesigns_updated_at on public.site_redesigns;
create trigger site_redesigns_updated_at
  before update on public.site_redesigns
  for each row execute procedure public.set_updated_at();

alter table public.site_redesigns enable row level security;
alter table public.site_redesigns force row level security;

drop policy if exists site_redesigns_select on public.site_redesigns;
drop policy if exists site_redesigns_insert on public.site_redesigns;
drop policy if exists site_redesigns_update on public.site_redesigns;
drop policy if exists site_redesigns_delete on public.site_redesigns;

create policy site_redesigns_select on public.site_redesigns
  for select to authenticated
  using (public.is_operator());
create policy site_redesigns_insert on public.site_redesigns
  for insert to authenticated
  with check (public.is_operator());
create policy site_redesigns_update on public.site_redesigns
  for update to authenticated
  using (public.is_operator())
  with check (public.is_operator());
create policy site_redesigns_delete on public.site_redesigns
  for delete to authenticated
  using (public.is_operator());

grant select, insert, update, delete on public.site_redesigns to authenticated;
grant all on public.site_redesigns to service_role;
