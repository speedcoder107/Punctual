-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Stores each signed-in user's app data as key/value rows, scoped by row-level
-- security so a user can only ever read or write their own rows.

create table if not exists user_storage (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table user_storage enable row level security;

create policy "select own rows" on user_storage
  for select using (auth.uid() = user_id);

create policy "insert own rows" on user_storage
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on user_storage
  for update using (auth.uid() = user_id);
