# Heaven Bakers App — Setup and Run

This project includes a React Vite + TypeScript frontend and a Node + TypeScript backend with PostgreSQL.

## Prerequisites
- Node.js (18+ recommended)
- npm
- PostgreSQL (running locally)

## Database
- Name: `Heaven_Bakers`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

The backend connects by default to:
```
postgres://postgres:postgres@localhost:5432/Heaven_Bakers
```
On startup, the backend will:
- Create the database if missing (requires your `postgres` user to have CREATE DATABASE privileges)
- Create table `users (user_id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password TEXT NOT NULL)`
- Seed an admin user with hashed password (`admin` / `admin123`)

## Backend (Node on TypeScript entry)
```
cd backend
npm install
npm start
```
- Starts `node -r ts-node/register index.ts`
- API base: `http://localhost:5000/`
- Login endpoint: `POST /api/auth/login` with JSON `{ "username": "admin", "password": "admin123" }`

If you prefer not to use npm scripts, you can run directly:
```
cd backend
node -r ts-node/register index.ts
```

## Frontend (Vite dev server)
```
cd frontend
npm install
npm run dev
```
- Opens `http://localhost:5173/`
- Login with `admin/admin123`, redirects to Dashboard.

## Proxy
The frontend proxies `/api` to `http://localhost:5000` via `frontend/vite.config.ts`, so frontend requests use `/api/...`.

## Environment Variables (optional)
Create `backend/.env` if you want to override defaults:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/Heaven_Bakers
JWT_SECRET=replace-with-strong-secret
PORT=5000
```

## Troubleshooting
- If the editor shows TypeScript module not found errors, restart the TypeScript server or reload the window.
- If database creation fails, ensure your `postgres` user has privileges, or create `Heaven_Bakers` manually.
- If you want to run without `tsconfig.json`, set:
```
set NODE_OPTIONS=-r ts-node/register
node index.ts
```