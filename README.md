# USV Events Platform

Platforma web pentru managementul evenimentelor universitare USV.

## Stack
- Backend: FastAPI + Supabase Python client
- Frontend: React + TypeScript + Vite
- Auth + DB: Supabase

## API implementat
- `POST /auth/google`
- `POST /auth/login`
- `GET /auth/me`
- `GET /events`
- `POST /events`
- `POST /events/{id}/register`

## Cum functioneaza acum
- `POST /auth/login` foloseste Supabase Auth cu email/parola.
- daca utilizatorul nu exista inca, backend-ul il poate crea prin Supabase Admin si apoi face login.
- `POST /auth/google` foloseste `sign_in_with_id_token`, deci frontend-ul trimite catre backend `id_token` primit dupa Google Sign-In.
- `GET /auth/me` valideaza tokenul Supabase din header-ul `Authorization: Bearer ...`.
- evenimentele si inscrierile sunt salvate in tabele Supabase prin clientul Python.

## Setup Supabase
1. Creeaza proiectul in Supabase.
2. Ruleaza scriptul [supabase_schema.sql](C:/workspace/usv-events-platform/backend/sql/supabase_schema.sql) in SQL Editor.
3. Activeaza providerul Google in `Authentication -> Providers`.
4. Copiaza `backend/.env.example` in `backend/.env` si completeaza valorile Supabase.
5. Pentru `POST /auth/google`, frontend-ul trebuie sa trimita `id_token` Google catre backend.

Backend-ul foloseste `SUPABASE_SERVICE_ROLE_KEY` pentru operatiile server-side pe tabele. Cheia asta trebuie pastrata doar pe backend.

## Migrare cu Supabase CLI
Structura pentru migrare este pregatita in [supabase/config.toml](C:/workspace/usv-events-platform/supabase/config.toml) si [20260401191500_init_events_schema.sql](C:/workspace/usv-events-platform/supabase/migrations/20260401191500_init_events_schema.sql).

Pasii uzuali sunt:
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Dupa `supabase link`, inlocuieste `project_id` din `supabase/config.toml` cu project ref-ul real daca este nevoie.

## Pornire
```bash
docker compose up --build
```

## Testare backend
```bash
cd backend
pytest
```
