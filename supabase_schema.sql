-- ══════════════════════════════════════════════════
--  SkillIssue — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════

-- ── 1. Enable the UUID extension (may already be enabled) ──
create extension if not exists "uuid-ossp";

-- ── 2. Skills table ────────────────────────────────────────
create table if not exists public.skills (
    id          uuid primary key default uuid_generate_v4(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    title       text not null,
    content     text not null,
    tags        text[] default '{}',
    visibility  text not null default 'private' check (visibility in ('public', 'private')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ── 3. Auto-update `updated_at` on row update ──────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger skills_set_updated_at
    before update on public.skills
    for each row execute procedure public.set_updated_at();

-- ── 4. Row-Level Security ──────────────────────────────────
--  Users can only read/write their own skills.
--  Public skills are readable by everyone (marketplace use case).

alter table public.skills enable row level security;

-- Owner can do anything with their own skills
create policy "Users can manage their own skills"
    on public.skills
    for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Anyone (including anonymous) can read public skills
create policy "Public skills are visible to everyone"
    on public.skills
    for select
    using (visibility = 'public');

-- ── 5. Helpful indexes ─────────────────────────────────────
create index if not exists skills_user_id_idx   on public.skills(user_id);
create index if not exists skills_visibility_idx on public.skills(visibility);
create index if not exists skills_created_at_idx on public.skills(created_at desc);


-- ══════════════════════════════════════════════════════════
--  USERS (Public Profiles) Table
--  ⚠️  Run this block in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- ── 6. Users table (public profiles) ───────────────────────
create table if not exists public.users (
    id          uuid primary key references auth.users(id) on delete cascade,
    username    text unique not null,
    email       text,
    avatar_url  text,
    created_at  timestamptz not null default now()
);

-- ── 7. Row-Level Security for users ────────────────────────
alter table public.users enable row level security;

-- Users can modify only their own profile
create policy "Users manage own profile"
    on public.users
    for all
    using  (auth.uid() = id)
    with check (auth.uid() = id);

-- Anyone can read usernames (needed for availability checks + public profiles)
create policy "Usernames are public"
    on public.users
    for select
    using (true);

-- ── 8. Index on username for fast lookups ──────────────────
create index if not exists users_username_idx on public.users(username);
