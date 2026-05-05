alter table if exists public.events
drop column if exists creator_name,
drop column if exists organizer_name;
