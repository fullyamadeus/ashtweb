-- Apply to an existing Supabase project before deploying author-written translations.
-- Safe whether or not the original-language feature was previously deployed.
alter table public.papers add column if not exists original_language text
  check (original_language in ('sq', 'mk', 'en'));
alter table public.papers add column if not exists translations jsonb not null default '{}'::jsonb
  check (jsonb_typeof(translations) = 'object');
