# Heaven Bakers — Run Guide

This project contains a React frontend (Vite) and a Node.js/Express backend with PostgreSQL. Follow these steps to run the app after cloning the repository.

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ running locally

## 1) Clone the repo
```bash
git clone <your-repo-url>
cd Heaven_Bakers
```

## 2) Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend` (optional but recommended):
```env
# Server
PORT=5000
# Database connection string
DATABASE_URL=postgres://postgres:postgres@localhost:5432/Heaven_Bakers
# JWT signing secret
JWT_SECRET=dev-secret
```
Notes:
- If you skip `.env`, the backend defaults to `PORT=5000`, `DATABASE_URL=postgres://postgres:postgres@localhost:5432/Heaven_Bakers`, and `JWT_SECRET=dev-secret`.
- On first start, the backend will auto-create required tables and seed an admin user (`admin` / `admin123`).

Start the backend:
```bash
npm start
```
The server listens on `http://localhost:5000`.

## 3) Frontend setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The app runs on `http://localhost:5173`.

The frontend is configured to proxy API calls to the backend at `/api` via `vite.config.ts`.

## 4) Login
- Username: `admin`
- Password: `admin123`

## Useful scripts
- Backend: `npm start` — run server
- Frontend: `npm run dev` — run Vite dev server
- Frontend: `npm run build` — production build
- Frontend: `npm run preview` — preview the build

## Troubleshooting
- Ensure PostgreSQL is running and accessible at the `DATABASE_URL` you set.
- If the database does not exist, the backend will attempt to create it automatically using your connection settings.
- If login fails, stop and restart the backend to re-run the admin seed.
