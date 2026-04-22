create extension if not exists pgcrypto;

create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text null,
    location text null,
    starts_at timestamptz not null,
    ends_at timestamptz null,
    max_participants integer null check (max_participants is null or max_participants > 0),
    registration_count integer not null default 0,
    creator_id uuid not null references auth.users(id) on delete cascade,
    creator_name text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    registered_at timestamptz not null default now(),
    constraint uq_event_registration unique (event_id, user_id)
);

create index if not exists idx_events_starts_at on public.events (starts_at);
create index if not exists idx_event_registrations_event_id on public.event_registrations (event_id);
create index if not exists idx_event_registrations_user_id on public.event_registrations (user_id);
