# Drugstore SaaS

Monorepo: API (`backend/`) y app web (`frontend/`).

## Backend (NestJS + Prisma)

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
