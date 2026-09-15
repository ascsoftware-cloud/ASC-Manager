-- Tables were created with "automatically expose new tables" off, so PostgREST
-- had no GRANT. RLS still applies; this only lets the API see the tables.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Public site must not read tables directly — only the RPCs already granted.
revoke all on all tables in schema public from anon, public;

grant execute on function public.get_public_site(text) to anon, authenticated;
grant execute on function public.submit_public_enquiry(text, text, text, text, text) to anon, authenticated;
grant execute on function public.is_operator() to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
