-- Team access: a client account can have several logins.
--   access = 'admin'  the account owner. Sees every page and every site, and
--                     manages the team (add, edit, remove, reset password).
--   access = 'staff'  sees only the pages in `permissions` and the sites in
--                     `site_ids` (empty site_ids = every site on the account).
-- Existing client logins become admins, so nobody loses access.
--
-- Team changes themselves go through server functions (service role) that
-- check the caller is that account's admin or ASC staff. Page visibility is
-- enforced in the app; table-level row security is still per account.

alter table public.profiles
  add column if not exists access text not null default 'admin'
    check (access in ('admin', 'staff')),
  add column if not exists permissions text[] not null default '{}',
  add column if not exists site_ids uuid[] not null default '{}';

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'client'
      and access = 'admin'
  );
$$;

revoke all on function public.is_tenant_admin() from public;
grant execute on function public.is_tenant_admin() to authenticated;

-- A client admin can read the logins on their own account (the team list).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_operator()
    or (public.is_tenant_admin() and tenant_id = public.current_tenant_id())
  );

-- Signed-in people may edit only their own display name. Access, pages, sites,
-- role and tenant change through the server (no JWT subject) or by ASC staff.
create or replace function public.protect_profile_staff_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_operator() then
    return new;
  end if;
  new.role := old.role;
  new.tenant_id := old.tenant_id;
  new.email := old.email;
  new.user_id := old.user_id;
  new.access := old.access;
  new.permissions := old.permissions;
  new.site_ids := old.site_ids;
  return new;
end;
$$;

-- Invites carry access, permissions and site_ids in their metadata.
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
  a text;
  perms text[];
  sids uuid[];
begin
  r := new.raw_user_meta_data->>'role';
  if r is null or r not in ('operator', 'client') then
    raise exception 'user must be invited with a role';
  end if;
  n := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1));
  a := coalesce(nullif(new.raw_user_meta_data->>'access', ''), 'admin');
  if a not in ('admin', 'staff') then
    raise exception 'access must be admin or staff';
  end if;
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
    a := 'admin';
  end if;
  perms := array(
    select jsonb_array_elements_text(
      coalesce(new.raw_user_meta_data->'permissions', '[]'::jsonb)
    )
  );
  sids := array(
    select (jsonb_array_elements_text(
      coalesce(new.raw_user_meta_data->'site_ids', '[]'::jsonb)
    ))::uuid
  );
  if a = 'admin' then
    perms := '{}';
    sids := '{}';
  end if;
  insert into public.profiles (user_id, tenant_id, role, name, email, access, permissions, site_ids)
  values (new.id, tid, r, n, new.email, a, perms, sids);
  return new;
end;
$$;
