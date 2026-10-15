begin;

do $$
declare table_name text;
begin
  foreach table_name in array array['projects','papers','login_attempts'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS is missing from %', table_name;
    end if;
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT') or
       has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') then
      raise exception 'Private data grants exposed for %', table_name;
    end if;
    if not has_table_privilege('service_role', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Server access is missing for %', table_name;
    end if;
  end loop;
  if has_function_privilege('anon', 'public.consume_login_attempt(text)', 'EXECUTE') then
    raise exception 'Anonymous users can call the login throttle';
  end if;
  if (select public from storage.buckets where id = 'papers') then
    raise exception 'PDF bucket must be private';
  end if;
end;
$$;

set local role service_role;
insert into public.projects (id, name) values ('11111111-1111-4111-8111-111111111111', 'Project');
insert into public.papers (id, title, author, project_id, published_snapshot) values (
  '22222222-2222-4222-8222-222222222222', 'Private draft title', 'Author',
  '11111111-1111-4111-8111-111111111111',
  '{"title":"Public title","author":"Author","projectId":"11111111-1111-4111-8111-111111111111"}'
);
delete from public.projects where id = '11111111-1111-4111-8111-111111111111';

do $$
declare p public.papers; n integer;
begin
  select * into p from public.papers where id = '22222222-2222-4222-8222-222222222222';
  if p.project_id is not null or p.published_snapshot->>'projectId' is not null or p.revision <> 2 then
    raise exception 'Project deletion did not preserve and detach both paper versions';
  end if;
  if p.title <> 'Private draft title' or p.published_snapshot->>'title' <> 'Public title' then
    raise exception 'Publication snapshot was changed unexpectedly';
  end if;
  begin
    insert into public.papers (published_snapshot) values ('{"title":"","author":""}');
    raise exception 'Blank publication identity was accepted';
  exception when check_violation then null;
  end;
  for n in 1..10 loop
    if not public.consume_login_attempt('test-address') then raise exception 'Throttle denied too early'; end if;
  end loop;
  if public.consume_login_attempt('test-address') then raise exception 'Throttle did not block'; end if;
  update public.login_attempts set window_start = now() - interval '16 minutes' where key = 'test-address';
  if not public.consume_login_attempt('test-address') then raise exception 'Throttle window did not expire'; end if;
end;
$$;

rollback;
select 'Schema, permissions, folder deletion, publication constraints and login throttling passed.' as result;
