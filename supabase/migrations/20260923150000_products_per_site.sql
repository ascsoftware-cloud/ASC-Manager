-- Each public site has its own shop catalogue.

alter table public.products
  add column if not exists site_id uuid references public.sites (id) on delete cascade;

update public.products p
set site_id = s.id
from (
  select distinct on (tenant_id) id, tenant_id
  from public.sites
  where kind = 'public'
  order by tenant_id, created_at, id
) s
where p.tenant_id = s.tenant_id and p.site_id is null;

update public.products p
set site_id = s.id
from (
  select distinct on (tenant_id) id, tenant_id
  from public.sites
  order by tenant_id, created_at, id
) s
where p.tenant_id = s.tenant_id and p.site_id is null;

drop index if exists products_tenant_idx;
create index if not exists products_site_idx on public.products (site_id, sort_order);

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
  sections jsonb;
  adverts jsonb;
  products jsonb;
  events jsonb;
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
    where a.site_id = s.id
      and a.status = 'live'
      and a.starts_on <= current_date
      and a.ends_on >= current_date
    order by a.updated_at desc
    limit 1;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', cs.key,
      'sortOrder', cs.sort_order,
      'visible', cs.visible,
      'payload', cs.payload
    )
    order by cs.sort_order
  ), '[]'::jsonb)
  into sections
  from public.content_sections cs
  where cs.site_id = s.id
    and cs.visible = true
    and (
      cs.key not in ('this_week', 'seo', 'faq', 'testimonials', 'gallery', 'services', 'staff')
      or (cs.key = 'this_week' and advert_on)
      or (cs.key = 'seo' and coalesce(t.modules_seo, false))
      or (cs.key = 'faq' and coalesce(t.modules_faq, false))
      or (cs.key = 'testimonials' and coalesce(t.modules_testimonials, false))
      or (cs.key = 'gallery' and coalesce(t.modules_gallery, false))
      or (cs.key = 'services' and coalesce(t.modules_services, false))
      or (cs.key = 'staff' and coalesce(t.modules_staff, false))
    );

  if advert_on then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'startsOn', a.starts_on,
        'endsOn', a.ends_on,
        'headline', a.headline,
        'body', a.body,
        'photoPath', a.photo_path,
        'linkType', a.link_type,
        'linkId', a.link_id
      )
      order by a.updated_at desc
    ), '[]'::jsonb)
    into adverts
    from public.weekly_adverts a
    where a.site_id = s.id
      and a.status = 'live'
      and a.starts_on <= current_date
      and a.ends_on >= current_date;
  else
    adverts := '[]'::jsonb;
  end if;

  if t.modules_store then
    select coalesce(jsonb_agg(
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
    ), '[]'::jsonb)
    into products
    from public.products p
    where p.site_id = s.id
      and p.live = true;
  else
    products := '[]'::jsonb;
  end if;

  if t.modules_calendar then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'startsAt', e.starts_at,
        'endsAt', e.ends_at,
        'place', e.place,
        'notes', e.notes
      )
      order by e.starts_at
    ), '[]'::jsonb)
    into events
    from public.calendar_events e
    where e.tenant_id = t.id
      and e.starts_at >= (now() - interval '12 hours');
  else
    events := '[]'::jsonb;
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
        'advert', advert_on,
        'seo', coalesce(t.modules_seo, false),
        'faq', coalesce(t.modules_faq, false),
        'testimonials', coalesce(t.modules_testimonials, false),
        'gallery', coalesce(t.modules_gallery, false),
        'services', coalesce(t.modules_services, false),
        'staff', coalesce(t.modules_staff, false)
      )
    ),
    'site', jsonb_build_object(
      'host', s.host,
      'url', s.url
    ),
    'sections', sections,
    'advert', advert,
    'adverts', adverts,
    'products', products,
    'events', events
  );
end;
$$;
