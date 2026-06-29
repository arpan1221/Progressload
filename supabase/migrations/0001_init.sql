-- Workout Tracker — initial schema
-- One table: sessions. Templates/exercises are hardcoded in the app.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  template_id text not null,
  payload jsonb not null,        -- the LoggedExercise[] for this session
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Idempotent policy creation
drop policy if exists "own rows" on public.sessions;
create policy "own rows" on public.sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists sessions_user_id_idx on public.sessions (user_id);
