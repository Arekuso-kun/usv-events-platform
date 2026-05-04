# USV Events Platform

## Setup

### 1. Creeaza proiectul Supabase

1. Creeaza un proiect nou in Supabase.
2. In `Authentication -> Providers`, activeaza Google daca vrei login OAuth.
3. In `SQL Editor`, ruleaza fisierele in ordinea:
   1. [reset.sql](C:/workspace/usv-events-platform/backend/sql/reset.sql) - doar daca vrei sa cureti schema existenta
   2. [schema.sql](C:/workspace/usv-events-platform/backend/sql/schema.sql)
   3. [supabase/seed.sql](C:/workspace/usv-events-platform/supabase/seed.sql)

### 2. Configureaza backend-ul

1. Copiaza `backend/.env.example` in `backend/.env`.
2. Seteaza cel putin:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL`

### 3. Configureaza frontend-ul

1. Copiaza `frontend/.env.example` in `frontend/.env`.
2. Seteaza:
   - `VITE_API_URL`

### 4. Porneste proiectul

Cu Docker:

```bash
docker compose up --build
```

Sau local, separat:

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Backend MVP acoperit

Backend-ul expune acum fluxurile minime din caietul de sarcini:

- autentificare email/parola pentru organizatori/admini si Google pentru studenti `@student.usv.ro`;
- listare evenimente publicate, detalii eveniment, filtre dupa facultate, departament, data, categorie, locatie, organizator, mod participare, intrare libera, inscriere si cod QR;
- CRUD evenimente pentru organizator/admin, cu publicare doar prin validare admin;
- inscriere la evenimente, lista participanti, export CSV si check-in;
- feedback/rating dupa eveniment;
- materiale publicate pe eveniment prin tabela `event_materials`;
- sponsori cu sigle si atasare sponsori la evenimente;
- export `.ics` si link Google Calendar;
- validare/rejectare evenimente, management organizatori si raport sumar pentru admin.

### 5. Lucreaza cu migrari Supabase

Pentru proiectul acesta, schema este tinuta in Supabase remote. Cand faci modificari direct in Supabase si vrei sa le salvezi intr-o migrare locala, foloseste `Session pooler` -> `URI` din pagina `Connect`.

Comanda este:

```bash
npx supabase db pull --db-url "SESSION_POOLER_URI"
```

Asta va genera o migrare noua in folderul [supabase/migrations](C:/workspace/usv-events-platform/supabase/migrations).

Fluxul recomandat este:

1. Modifici schema in Supabase.
2. Rulezi comanda de mai sus.
3. Verifici fisierul nou creat in `supabase/migrations`.
4. Salvezi migrarea in repository impreuna cu restul schimbarilor din proiect.
