create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type public.user_role as enum ('student', 'organizer', 'admin');
    end if;
    if not exists (select 1 from pg_type where typname = 'participation_mode') then
        create type public.participation_mode as enum ('physical', 'online', 'hybrid');
    end if;
    if not exists (select 1 from pg_type where typname = 'event_status') then
        create type public.event_status as enum ('draft', 'pending_approval', 'published', 'rejected', 'cancelled', 'completed');
    end if;
    if not exists (select 1 from pg_type where typname = 'registration_status') then
        create type public.registration_status as enum ('registered', 'waitlisted', 'cancelled', 'checked_in');
    end if;
    if not exists (select 1 from pg_type where typname = 'material_type') then
        create type public.material_type as enum ('presentation', 'image', 'pdf', 'other');
    end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.faculties (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    short_name text null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.departments (
    id uuid primary key default gen_random_uuid(),
    faculty_id uuid not null references public.faculties(id) on delete cascade,
    name text not null,
    short_name text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_department_per_faculty unique (faculty_id, name),
    constraint uq_department_short_name_per_faculty unique (faculty_id, short_name)
);

create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email citext not null unique,
    full_name text not null,
    role public.user_role not null default 'student',
    faculty_id uuid null references public.faculties(id) on delete set null,
    department_id uuid null references public.departments(id) on delete set null,
    student_domain_verified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.event_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.venues (
    id uuid primary key default gen_random_uuid(),
    address text null,
    building text null,
    room text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint venues_location_present_chk check (
        nullif(address, '') is not null
        or nullif(building, '') is not null
        or nullif(room, '') is not null
    )
);

create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text null,
    starts_at timestamptz not null,
    ends_at timestamptz null,
    venue_id uuid null references public.venues(id) on delete set null,
    category_id uuid null references public.event_categories(id) on delete set null,
    participation_mode public.participation_mode not null default 'physical',
    faculty_id uuid null references public.faculties(id) on delete set null,
    department_id uuid null references public.departments(id) on delete set null,
    registration_required boolean not null default false,
    registration_url text null,
    registration_deadline timestamptz null,
    max_participants integer null check (max_participants is null or max_participants > 0),
    is_free boolean not null default true,
    status public.event_status not null default 'draft',
    creator_id uuid not null references auth.users(id) on delete restrict,
    approved_by uuid null references auth.users(id) on delete set null,
    approved_at timestamptz null,
    rejection_reason text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint event_schedule_chk check (ends_at is null or ends_at > starts_at),
    constraint event_registration_deadline_chk check (
        registration_deadline is null or registration_deadline <= starts_at
    )
);

create table if not exists public.event_registrations (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status public.registration_status not null default 'registered',
    registered_at timestamptz not null default now(),
    cancelled_at timestamptz null,
    checked_in_at timestamptz null,
    constraint uq_event_registration unique (event_id, user_id)
);

create table if not exists public.event_feedback (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    rating integer not null check (rating between 1 and 5),
    comment text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_event_feedback unique (event_id, user_id)
);

create table if not exists public.event_materials (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    uploaded_by uuid not null references auth.users(id) on delete restrict,
    material_type public.material_type not null,
    title text not null,
    file_url text not null,
    file_name text null,
    file_size_bytes bigint null check (file_size_bytes is null or file_size_bytes >= 0),
    created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    logo_url text null,
    website_url text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.event_sponsors (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    sponsor_id uuid not null references public.sponsors(id) on delete cascade,
    display_order integer null check (display_order is null or display_order >= 0),
    created_at timestamptz not null default now(),
    constraint uq_event_sponsor unique (event_id, sponsor_id)
);

create index if not exists idx_departments_faculty_id on public.departments (faculty_id);
create index if not exists idx_user_profiles_faculty_id on public.user_profiles (faculty_id);
create index if not exists idx_user_profiles_department_id on public.user_profiles (department_id);
create index if not exists idx_events_starts_at on public.events (starts_at);
create index if not exists idx_events_status on public.events (status);
create index if not exists idx_events_category_id on public.events (category_id);
create index if not exists idx_events_creator_id on public.events (creator_id);
create index if not exists idx_events_venue_id on public.events (venue_id);
create index if not exists idx_events_faculty_id on public.events (faculty_id);
create index if not exists idx_events_department_id on public.events (department_id);
create index if not exists idx_event_registrations_event_id on public.event_registrations (event_id);
create index if not exists idx_event_registrations_user_id on public.event_registrations (user_id);
create index if not exists idx_event_feedback_event_id on public.event_feedback (event_id);
create index if not exists idx_event_materials_event_id on public.event_materials (event_id);
create index if not exists idx_event_sponsors_event_id on public.event_sponsors (event_id);
create index if not exists idx_event_sponsors_sponsor_id on public.event_sponsors (sponsor_id);

drop trigger if exists trg_faculties_updated_at on public.faculties;
create trigger trg_faculties_updated_at
before update on public.faculties
for each row execute function public.set_updated_at();

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_venues_updated_at on public.venues;
create trigger trg_venues_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists trg_event_feedback_updated_at on public.event_feedback;
create trigger trg_event_feedback_updated_at
before update on public.event_feedback
for each row execute function public.set_updated_at();

drop trigger if exists trg_sponsors_updated_at on public.sponsors;
create trigger trg_sponsors_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
    resolved_role public.user_role := case
        when email_domain = 'student.usv.ro' then 'student'::public.user_role
        else 'organizer'::public.user_role
    end;
    resolved_name text := coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        split_part(coalesce(new.email, ''), '@', 1)
    );
begin
    insert into public.user_profiles (
        id,
        email,
        full_name,
        role,
        student_domain_verified,
        created_at,
        updated_at
    )
    values (
        new.id,
        new.email,
        resolved_name,
        resolved_role,
        email_domain = 'student.usv.ro',
        now(),
        now()
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        student_domain_verified = excluded.student_domain_verified,
        updated_at = now();

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.sync_auth_user_profile();

insert into public.user_profiles (
    id,
    email,
    full_name,
    role,
    student_domain_verified,
    created_at,
    updated_at
)
select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
    case
        when lower(split_part(coalesce(u.email, ''), '@', 2)) = 'student.usv.ro' then 'student'::public.user_role
        else 'organizer'::public.user_role
    end,
    lower(split_part(coalesce(u.email, ''), '@', 2)) = 'student.usv.ro',
    coalesce(u.created_at, now()),
    now()
from auth.users u
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    student_domain_verified = excluded.student_domain_verified,
    updated_at = now();

create or replace view public.v_monthly_event_report as
select
    date_trunc('month', starts_at) as report_month,
    count(*) as total_events,
    count(*) filter (where status = 'published') as published_events
from public.events
group by 1
order by 1 desc;
