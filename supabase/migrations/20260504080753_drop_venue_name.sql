update public.venues
set address = coalesce(nullif(address, ''), name)
where nullif(building, '') is null
  and nullif(room, '') is null
  and name is not null;

update public.venues
set address = 'Locatie nespecificata'
where nullif(address, '') is null
  and nullif(building, '') is null
  and nullif(room, '') is null;

alter table if exists public.venues
    drop constraint if exists venues_name_key,
    drop column if exists name;

alter table if exists public.venues
    add constraint venues_location_present_chk check (
        nullif(address, '') is not null
        or nullif(building, '') is not null
        or nullif(room, '') is not null
    );
