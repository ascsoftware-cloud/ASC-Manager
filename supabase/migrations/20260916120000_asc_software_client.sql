grant execute on function public.is_operator() to service_role;
grant execute on function public.current_tenant_id() to service_role;

insert into public.profiles (user_id, tenant_id, role, name, email)
values (
  '73531742-c144-4129-9a47-46a7afc3f187',
  '69496802-4469-4727-8443-c3b9e7c5d421',
  'client',
  'ASC Software',
  'hello@ascsoftware.co.za'
)
on conflict (user_id) do update
set tenant_id = excluded.tenant_id,
    role = excluded.role,
    name = excluded.name,
    email = excluded.email;
