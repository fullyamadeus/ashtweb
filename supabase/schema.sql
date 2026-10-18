-- Run once in a new Supabase project's SQL Editor. Safe to run again.
-- The application uses the service_role key ONLY on its server.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create unique index if not exists projects_unique_name on public.projects (lower(name));

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null default '' check (length(title) <= 240),
  author text not null default '' check (length(author) <= 160),
  summary text not null default '' check (length(summary) <= 600),
  content_html text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  attachment jsonb,
  published_snapshot jsonb,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_has_identity check (published_snapshot is null or (
    coalesce(length(trim(published_snapshot->>'title')), 0) > 0 and
    coalesce(length(trim(published_snapshot->>'author')), 0) > 0
  ))
);
-- Existing articles remain unspecified until an editor sets their language.
alter table public.papers add column if not exists original_language text
  check (original_language in ('sq', 'mk', 'en'));

alter table public.papers add column if not exists translations jsonb not null default '{}'::jsonb
  check (jsonb_typeof(translations) = 'object');

create index if not exists papers_project on public.papers(project_id);
create index if not exists papers_updated on public.papers(updated_at desc);

create table if not exists public.login_attempts (
  key text primary key,
  attempts integer not null,
  window_start timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.papers enable row level security;
alter table public.login_attempts enable row level security;
revoke all on public.projects, public.papers, public.login_attempts from anon, authenticated;
grant all on public.projects, public.papers, public.login_attempts to service_role;
-- Intentionally no anonymous RLS policies: public readers use filtered server routes.

create or replace function public.consume_login_attempt(attempt_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare attempt_count integer;
begin
  delete from public.login_attempts where window_start < now() - interval '15 minutes';
  insert into public.login_attempts as current (key, attempts, window_start)
  values (attempt_key, 1, now())
  on conflict (key) do update set attempts = current.attempts + 1
  returning attempts into attempt_count;
  return attempt_count <= 10;
end;
$$;
revoke all on function public.consume_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;

create or replace function public.detach_project_papers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.papers set
    project_id = case when project_id = old.id then null else project_id end,
    published_snapshot = case
      when published_snapshot->>'projectId' = old.id::text
      then jsonb_set(published_snapshot, '{projectId}', 'null'::jsonb)
      else published_snapshot end,
    revision = revision + 1,
    updated_at = now()
  where project_id = old.id or published_snapshot->>'projectId' = old.id::text;
  return old;
end;
$$;
revoke all on function public.detach_project_papers() from public, anon, authenticated;
drop trigger if exists detach_project_before_delete on public.projects;
create trigger detach_project_before_delete before delete on public.projects
for each row execute function public.detach_project_papers();

-- Private PDFs. The server checks paper publication/admin status on each download.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', false, 4000000, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 4000000,
  allowed_mime_types = array['application/pdf'];
-- Do not add public storage policies for this bucket.
