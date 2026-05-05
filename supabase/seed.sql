insert into public.faculties (name, short_name)
values
    ('Facultatea de Inginerie Electrica si Stiinta Calculatoarelor', 'FIESC'),
    ('Facultatea de Educatie Fizica si Sport', 'FEFS')
on conflict (name) do update
set short_name = excluded.short_name;

insert into public.departments (faculty_id, name, short_name)
select f.id, 'Informatica', 'INF'
from public.faculties f
where f.short_name = 'FIESC'
on conflict (faculty_id, name) do update
set short_name = excluded.short_name;

insert into public.departments (faculty_id, name, short_name)
select f.id, 'Sport Universitar', 'SPORT'
from public.faculties f
where f.short_name = 'FEFS'
on conflict (faculty_id, name) do update
set short_name = excluded.short_name;

insert into public.event_categories (name)
values
    ('Academic'),
    ('Sport'),
    ('Career'),
    ('Volunteering'),
    ('Culture'),
    ('Other')
on conflict (name) do nothing;

insert into public.venues (address, building, room)
select 'Universitatea Stefan cel Mare din Suceava', 'Corp E', 'E201'
where not exists (
    select 1 from public.venues
    where address = 'Universitatea Stefan cel Mare din Suceava'
      and building = 'Corp E'
      and room = 'E201'
);

insert into public.venues (address, building, room)
select 'Universitatea Stefan cel Mare din Suceava', 'Corp E', 'Aula'
where not exists (
    select 1 from public.venues
    where address = 'Universitatea Stefan cel Mare din Suceava'
      and building = 'Corp E'
      and room = 'Aula'
);

insert into public.venues (address, building, room)
select 'Casa de Cultura a Studentilor Suceava', null, null
where not exists (
    select 1 from public.venues
    where address = 'Casa de Cultura a Studentilor Suceava'
      and building is null
      and room is null
);

insert into public.venues (address, building, room)
select 'Universitatea Stefan cel Mare din Suceava', 'Campus', 'Stadion'
where not exists (
    select 1 from public.venues
    where address = 'Universitatea Stefan cel Mare din Suceava'
      and building = 'Campus'
      and room = 'Stadion'
);

insert into public.sponsors (name, logo_url, website_url)
values
    ('Open Source Suceava', 'https://example.com/logos/oss.svg', 'https://example.com/oss'),
    ('Assist Software', 'https://example.com/logos/assist.svg', 'https://assist-software.net')
on conflict (name) do update
set logo_url = excluded.logo_url,
    website_url = excluded.website_url,
    updated_at = now();

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
    coalesce(
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name',
        split_part(u.email, '@', 1)
    ),
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
    role = excluded.role,
    student_domain_verified = excluded.student_domain_verified,
    updated_at = now();

do $$
declare
    organizer_id uuid;
    attendee_id uuid;
    workshop_event_id uuid;
    career_event_id uuid;
    gala_event_id uuid;
    fiesc_id uuid;
    fefs_id uuid;
    informatics_department_id uuid;
    sport_department_id uuid;
    workshop_venue_id uuid;
    career_venue_id uuid;
    gala_venue_id uuid;
    cross_venue_id uuid;
    oss_sponsor_id uuid;
    assist_sponsor_id uuid;
begin
    select id into fiesc_id
    from public.faculties
    where short_name = 'FIESC';

    select id into fefs_id
    from public.faculties
    where short_name = 'FEFS';

    select d.id into informatics_department_id
    from public.departments d
    join public.faculties f on f.id = d.faculty_id
    where f.short_name = 'FIESC'
      and d.short_name = 'INF';

    select d.id into sport_department_id
    from public.departments d
    join public.faculties f on f.id = d.faculty_id
    where f.short_name = 'FEFS'
      and d.short_name = 'SPORT';

    select id into workshop_venue_id
    from public.venues
    where building = 'Corp E'
      and room = 'E201';

    select id into career_venue_id
    from public.venues
    where building = 'Corp E'
      and room = 'Aula';

    select id into gala_venue_id
    from public.venues
    where address = 'Casa de Cultura a Studentilor Suceava'
      and building is null
      and room is null;

    select id into cross_venue_id
    from public.venues
    where building = 'Campus'
      and room = 'Stadion';

    select id into oss_sponsor_id
    from public.sponsors
    where name = 'Open Source Suceava';

    select id into assist_sponsor_id
    from public.sponsors
    where name = 'Assist Software';

    select up.id
    into organizer_id
    from public.user_profiles up
    order by
        case up.role
            when 'admin' then 0
            when 'organizer' then 1
            else 2
        end,
        up.created_at
    limit 1;

    if organizer_id is null then
        raise notice 'Seed skipped event/demo data because auth.users is empty.';
        return;
    end if;

    select up.id
    into attendee_id
    from public.user_profiles up
    where up.id <> organizer_id
    order by
        case up.role
            when 'student' then 0
            else 1
        end,
        up.created_at
    limit 1;

    if fiesc_id is not null then
        update public.user_profiles
        set faculty_id = fiesc_id,
            department_id = informatics_department_id
        where id = organizer_id
          and faculty_id is null;
    end if;

    if attendee_id is not null and fiesc_id is not null then
        update public.user_profiles
        set faculty_id = fiesc_id,
            department_id = informatics_department_id
        where id = attendee_id
          and faculty_id is null;
    end if;

    insert into public.events (
        title,
        description,
        starts_at,
        ends_at,
        venue_id,
        category_id,
        participation_mode,
        faculty_id,
        department_id,
        registration_required,
        registration_url,
        registration_deadline,
        max_participants,
        is_free,
        status,
        creator_id,
        approved_by,
        approved_at
    )
    select
        'Workshop FastAPI la USV',
        'Atelier practic despre dezvoltarea unei aplicatii web pentru managementul evenimentelor universitare.',
        now() + interval '7 days',
        now() + interval '7 days 3 hours',
        workshop_venue_id,
        ec.id,
        'hybrid'::public.participation_mode,
        fiesc_id,
        informatics_department_id,
        true,
        'https://example.com/usv-fastapi-workshop',
        now() + interval '6 days',
        80,
        true,
        'published'::public.event_status,
        organizer_id,
        organizer_id,
        now()
    from public.event_categories ec
    where ec.name = 'Academic'
      and not exists (
          select 1
          from public.events e
          where e.title = 'Workshop FastAPI la USV'
      );

    insert into public.events (
        title,
        description,
        starts_at,
        ends_at,
        venue_id,
        category_id,
        participation_mode,
        faculty_id,
        department_id,
        registration_required,
        registration_url,
        registration_deadline,
        max_participants,
        is_free,
        status,
        creator_id,
        approved_by,
        approved_at
    )
    select
        'USV Career Connect 2026',
        'Targ de cariere cu companii IT, sesiuni de networking si discutii despre internship-uri.',
        now() + interval '14 days',
        now() + interval '14 days 5 hours',
        career_venue_id,
        ec.id,
        'physical'::public.participation_mode,
        null,
        null,
        true,
        'https://example.com/usv-career-connect',
        now() + interval '13 days',
        250,
        true,
        'published'::public.event_status,
        organizer_id,
        organizer_id,
        now()
    from public.event_categories ec
    where ec.name = 'Career'
      and not exists (
          select 1
          from public.events e
          where e.title = 'USV Career Connect 2026'
      );

    insert into public.events (
        title,
        description,
        starts_at,
        ends_at,
        venue_id,
        category_id,
        participation_mode,
        faculty_id,
        department_id,
        registration_required,
        registration_url,
        registration_deadline,
        max_participants,
        is_free,
        status,
        creator_id,
        approved_by,
        approved_at
    )
    select
        'Gala Studentilor USV',
        'Eveniment cultural dedicat comunitatii USV, cu momente artistice si premiere.',
        now() - interval '10 days',
        now() - interval '10 days' + interval '4 hours',
        gala_venue_id,
        ec.id,
        'physical'::public.participation_mode,
        null,
        null,
        false,
        null,
        null,
        null,
        true,
        'completed'::public.event_status,
        organizer_id,
        organizer_id,
        now() - interval '12 days'
    from public.event_categories ec
    where ec.name = 'Culture'
      and not exists (
          select 1
          from public.events e
          where e.title = 'Gala Studentilor USV'
      );

    insert into public.events (
        title,
        description,
        starts_at,
        ends_at,
        venue_id,
        category_id,
        participation_mode,
        faculty_id,
        department_id,
        registration_required,
        registration_url,
        registration_deadline,
        max_participants,
        is_free,
        status,
        creator_id,
        approved_by,
        approved_at
    )
    select
        'Crosul Campusului USV',
        'Competitie sportiva pentru studenti si cadre didactice, desfasurata in campusul universitar.',
        now() + interval '21 days',
        now() + interval '21 days 2 hours',
        cross_venue_id,
        ec.id,
        'physical'::public.participation_mode,
        fefs_id,
        sport_department_id,
        true,
        'https://example.com/cros-campus-usv',
        now() + interval '20 days',
        120,
        true,
        'published'::public.event_status,
        organizer_id,
        organizer_id,
        now()
    from public.event_categories ec
    where ec.name = 'Sport'
      and not exists (
          select 1
          from public.events e
          where e.title = 'Crosul Campusului USV'
      );

    select id into workshop_event_id
    from public.events
    where title = 'Workshop FastAPI la USV';

    select id into career_event_id
    from public.events
    where title = 'USV Career Connect 2026';

    select id into gala_event_id
    from public.events
    where title = 'Gala Studentilor USV';

    if workshop_event_id is not null then
        insert into public.event_sponsors (event_id, sponsor_id, display_order)
        select workshop_event_id, oss_sponsor_id, 1
        where oss_sponsor_id is not null
          and not exists (
              select 1
              from public.event_sponsors es
              where es.event_id = workshop_event_id
                and es.sponsor_id = oss_sponsor_id
          );

        insert into public.event_materials (event_id, uploaded_by, material_type, title, file_url, file_name, file_size_bytes)
        select workshop_event_id, organizer_id, 'presentation'::public.material_type, 'Agenda workshop', 'https://example.com/files/workshop-fastapi-agenda.pdf', 'workshop-fastapi-agenda.pdf', 245760
        where not exists (
            select 1
            from public.event_materials em
            where em.event_id = workshop_event_id
              and em.title = 'Agenda workshop'
        );
    end if;

    if career_event_id is not null then
        insert into public.event_sponsors (event_id, sponsor_id, display_order)
        select career_event_id, assist_sponsor_id, 1
        where assist_sponsor_id is not null
          and not exists (
              select 1
              from public.event_sponsors es
              where es.event_id = career_event_id
                and es.sponsor_id = assist_sponsor_id
          );
    end if;

    if gala_event_id is not null then
        insert into public.event_materials (event_id, uploaded_by, material_type, title, file_url, file_name, file_size_bytes)
        select gala_event_id, organizer_id, 'pdf'::public.material_type, 'Programul galei', 'https://example.com/files/gala-studentilor-program.pdf', 'gala-studentilor-program.pdf', 180224
        where not exists (
            select 1
            from public.event_materials em
            where em.event_id = gala_event_id
              and em.title = 'Programul galei'
        );
    end if;

    if attendee_id is not null and workshop_event_id is not null then
        insert into public.event_registrations (event_id, user_id, status, registered_at)
        select workshop_event_id, attendee_id, 'registered'::public.registration_status, now() - interval '1 day'
        where not exists (
            select 1
            from public.event_registrations er
            where er.event_id = workshop_event_id
              and er.user_id = attendee_id
        );
    end if;

    if attendee_id is not null and gala_event_id is not null then
        insert into public.event_registrations (event_id, user_id, status, registered_at, checked_in_at)
        select gala_event_id, attendee_id, 'checked_in'::public.registration_status, now() - interval '12 days', now() - interval '10 days'
        where not exists (
            select 1
            from public.event_registrations er
            where er.event_id = gala_event_id
              and er.user_id = attendee_id
        );

        insert into public.event_feedback (event_id, user_id, rating, comment)
        select gala_event_id, attendee_id, 5, 'Eveniment foarte bine organizat, cu atmosfera placuta si program divers.'
        where not exists (
            select 1
            from public.event_feedback ef
            where ef.event_id = gala_event_id
              and ef.user_id = attendee_id
        );
    end if;
end
$$;
