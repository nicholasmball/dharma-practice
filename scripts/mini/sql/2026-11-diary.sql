-- Diary of teacher sessions (card 26bbbc17), stage 1.
--
-- NOT applied automatically. Apply on the mini only at release, with Nick's go-ahead:
--   psql -d dharma -f scripts/mini/sql/2026-11-diary.sql
--   launchctl kickstart -k gui/$(id -u)/com.dharma.postgrest   # PostgREST must reload to see the tables
--   scripts/mini/backup-db.sh
--
-- Only adds two tables; nothing existing is changed. Safe to apply before the app code ships.
-- Security mirrors the existing tables: row-level security keyed on auth.uid(), grants to
-- `authenticated` only (the older tables also grant to `anon`; that isn't needed here).

begin;

create table public.diary_sessions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,                          -- Balla Bot's session id
  teacher text not null,
  kind text not null check (kind in ('coaching','mentoring','training_1to1','group','other')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','removed')),
  skipped boolean not null default false,           -- "didn't happen"
  writeup_dismissed boolean not null default false, -- "no write-up needed"
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  meditation_session_id uuid references public.meditation_sessions(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_id)
);

create index diary_sessions_user_start on public.diary_sessions (user_id, starts_at);

create table public.diary_sync_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz
);

alter table public.diary_sessions enable row level security;
alter table public.diary_sync_status enable row level security;

create policy "Users can view own diary sessions" on public.diary_sessions
  for select using (user_id = (select auth.uid()));
create policy "Users can insert own diary sessions" on public.diary_sessions
  for insert with check (user_id = (select auth.uid()));
create policy "Users can update own diary sessions" on public.diary_sessions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can delete own diary sessions" on public.diary_sessions
  for delete using (user_id = (select auth.uid()));

create policy "Users can view own diary sync status" on public.diary_sync_status
  for select using (user_id = (select auth.uid()));
create policy "Users can insert own diary sync status" on public.diary_sync_status
  for insert with check (user_id = (select auth.uid()));
create policy "Users can update own diary sync status" on public.diary_sync_status
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can delete own diary sync status" on public.diary_sync_status
  for delete using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.diary_sessions to authenticated;
grant select, insert, update, delete on public.diary_sync_status to authenticated;

commit;
