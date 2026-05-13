# Drugstore SaaS

Monorepo: API (`backend/`) y app web (`frontend/`).

## Backend (NestJS + Prisma)

Requiere Node.js `>=20.19.0` (Nest 11 y Prisma 7 no corren bien en Node 16/18 antiguos).

```bash
cd backend
cp .env.example .env   # configurar DATABASE_URL, JWT_SECRET, etc.
npm install
npm run prisma:migrate
npm run start:dev
```

Por defecto escucha en `http://localhost:3000`.

## Frontend (Vite + React)

```bash
cd frontend
cp .env.example .env   # opcional: VITE_API_URL
npm install
npm run dev
```

## Scripts útiles (desde `backend/`)

- `npm run build` — compilar
- `npm run test` / `npm run test:e2e` — tests
- `npm run prisma:seed` — datos de ejemplo

## Deploy backend

Configurar el servicio con root directory `backend/`.

- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod`
- Variables: `DATABASE_URL`, `JWT_SECRET`, `PORT` (si la plataforma no lo inyecta)
- Healthcheck: `/health`

`start:prod` ejecuta `prisma migrate deploy` antes de levantar `node dist/src/main.js`.
