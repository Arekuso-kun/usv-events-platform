# USV Events Platform

Platforma web pentru gestionarea evenimentelor universitare USV. Aplicatia include fluxuri pentru studenti, organizatori si administratori: publicarea evenimentelor, inscrieri, check-in, feedback, materiale, sponsori si validare administrativa.

## Tehnologii

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, Python, Pydantic
- Baza de date si autentificare: Supabase
- Containerizare: Docker Compose
- Analiza statica / SAST: SonarQube

## Structura proiectului

```text
backend/     API FastAPI, servicii, routere, teste si schema SQL
frontend/    Aplicatia React/Vite
supabase/    Migrari si seed pentru baza de date
documents/   Documente locale de laborator si documentatie suport
```

## Configurare

### 1. Supabase

1. Creeaza un proiect nou in Supabase.
2. Optional, activeaza autentificarea Google din `Authentication -> Providers`.
3. Ruleaza scripturile SQL in ordinea:
   1. `backend/sql/reset.sql`, doar daca vrei sa cureti schema existenta
   2. `backend/sql/schema.sql`
   3. `supabase/seed.sql`

### 2. Backend

1. Creeaza fisierul `backend/.env`.
2. Seteaza cel putin urmatoarele variabile:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=
```

Pentru rulare locala, este recomandat un mediu virtual Python:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend

1. Creeaza fisierul `frontend/.env`.
2. Seteaza URL-ul API-ului:

```env
VITE_API_URL=http://localhost:8000
```

Pornire locala:

```powershell
cd frontend
npm install
npm run dev
```

## Rulare cu Docker

Aplicatia poate fi pornita cu Docker Compose:

```powershell
docker compose up --build
```

Serviciile expuse implicit:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Functionalitati acoperite

- autentificare email/parola pentru organizatori si administratori;
- autentificare Google pentru studenti `@student.usv.ro`;
- listare evenimente publicate si detalii eveniment;
- filtrare dupa facultate, departament, data, categorie, locatie, organizator si mod de participare;
- CRUD evenimente pentru organizator/admin;
- publicarea evenimentelor doar dupa validare administrativa;
- inscriere la evenimente, lista participanti, export CSV si check-in;
- feedback si rating dupa eveniment;
- materiale publicate pe eveniment;
- sponsori cu sigle si atasare la evenimente;
- export `.ics` si link Google Calendar;
- management organizatori si raport sumar pentru admin.

## Testare si validare

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

Frontend:

```powershell
cd frontend
npm run build
npm run lint
```

## Analiza SAST cu SonarQube

Pentru laboratorul 05, proiectul include configurare pentru analiza statica de securitate cu SonarQube.

Fisierul `sonar-project.properties` defineste proiectul analizat:

- `backend/app` pentru codul Python/FastAPI;
- `frontend/src` pentru codul React/TypeScript;
- `backend/tests` pentru testele backend;
- excluderi pentru `.venv`, `node_modules`, `dist`, `build`, `__pycache__` si rapoarte generate.

SonarQube poate fi pornit local cu Docker:

```powershell
docker compose -f docker-compose.sonar.yml up -d
```

Interfata este disponibila la:

```text
http://localhost:9000
```

Dupa crearea proiectului local `usv-events-platform` si generarea unui token in SonarQube, analiza poate fi rulata astfel:

```powershell
$env:SONAR_HOST_URL="http://localhost:9000"
$env:SONAR_TOKEN="TOKENUL_TAU"
npx @sonar/scan
```

Rezultatele analizei sunt disponibile in dashboard-ul proiectului din SonarQube, in pagina `Overview`.

## Migrari Supabase

Schema proiectului este mentinuta in Supabase. Cand faci modificari direct in Supabase si vrei sa le salvezi intr-o migrare locala, foloseste `Session pooler -> URI` din pagina `Connect`.

Comanda recomandata:

```powershell
npx supabase db pull --db-url "SESSION_POOLER_URI"
```

Flux recomandat:

1. Modifici schema in Supabase.
2. Rulezi comanda de mai sus.
3. Verifici fisierul nou creat in `supabase/migrations`.
4. Salvezi migrarea in repository impreuna cu restul schimbarilor relevante.
