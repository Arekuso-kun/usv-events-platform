insert into storage.buckets (id, name, public)
values ('event-materials', 'event-materials', true)
on conflict (id) do update
set public = excluded.public;
