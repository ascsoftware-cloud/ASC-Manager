-- Monthly billing through PayFast.
--
--   subscriptions  one monthly plan per client. Staff set the amount, the
--                  client pays through PayFast, PayFast tells us how it went.
--   payments       one row per PayFast payment (repeat notifications are
--                  ignored through the unique pf_payment_id).
--   payment_links  expiring, no-login links staff can send. Only a hash of
--                  the link is stored.
--
-- Nobody can write these tables from the browser. Every change goes through a
-- server function or the PayFast webhook using the service role, which bypasses
-- RLS. Signed-in people can only read: staff everything, a client its own
-- account if it is an account admin or was given the Billing permission.
-- Card details never reach this database; PayFast keeps them.

create or replace function public.can_see_billing(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and (
        role = 'operator'
        or (
          role = 'client'
          and tenant_id = t
          and (access = 'admin' or 'billing' = any(permissions))
        )
      )
  );
$$;

revoke all on function public.can_see_billing(uuid) from public;
grant execute on function public.can_see_billing(uuid) to authenticated;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  -- The price-list package (single, starter, standard, scale) or "custom".
  package text not null default 'custom'
    check (package in ('single', 'starter', 'standard', 'scale', 'custom')),
  has_database boolean not null default false,
  amount_zar numeric(10, 2) not null check (amount_zar > 0),
  item text not null default 'Monthly hosting and maintenance',
  status text not null default 'awaiting'
    check (status in ('awaiting', 'active', 'failed', 'cancelled')),
  payfast_token text unique,
  next_billing_on date,
  last_paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  pf_payment_id text not null unique,
  amount_zar numeric(10, 2) not null,
  status text not null check (status in ('complete', 'failed', 'cancelled')),
  paid_at timestamptz not null default now()
);

create index if not exists payments_tenant_idx on public.payments (tenant_id, paid_at desc);

create table if not exists public.payment_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_links enable row level security;

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.can_see_billing(tenant_id));

create policy payments_select on public.payments
  for select to authenticated
  using (public.can_see_billing(tenant_id));

-- payment_links has no policy on purpose: nobody signed in can read or write it.

revoke all on public.subscriptions, public.payments, public.payment_links
  from anon, authenticated, public;
grant select on public.subscriptions, public.payments to authenticated;
grant all on public.subscriptions, public.payments, public.payment_links to service_role;
