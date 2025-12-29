-- Supabase/Postgres schema for Job Application Central

create extension if not exists "pgcrypto";

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null default '',
  company text not null default '',
  application_status text not null default 'applied',
  job_description text not null default '',
  resume jsonb not null default '{}'::jsonb,
  cover_letter jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_updated_at_idx on applications (user_id, updated_at desc);

