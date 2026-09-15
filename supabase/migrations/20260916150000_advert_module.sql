-- Weekly advert is a tenant module. Default off. Staff turn it on per client
-- (Collage). Other sites never see This week.

alter table public.tenants
  add column if not exists modules_bookings boolean not null default false;
alter table public.tenants
  add column if not exists modules_advert boolean not null default false;

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
  new.modules_advert := old.modules_advert;
  new.status := old.status;
  new.name := old.name;
  return new;
end;
$$;

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
  advert_on boolean;
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

  advert_on := coalesce(t.modules_advert, false);
  advert := null;
  if advert_on then
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
  end if;

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
        'bookings', coalesce(t.modules_bookings, false),
        'advert', advert_on
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
        and (advert_on or cs.key <> 'this_week')
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
