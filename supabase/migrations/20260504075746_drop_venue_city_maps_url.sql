alter table if exists public.venues
    drop column if exists city,
    drop column if exists maps_url;
