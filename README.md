# Heaven Bakers — How to Run

Heaven Bakers is a React (Vite) frontend and a Node.js/Express backend with PostgreSQL.

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ running locally

## 1) Clone
```bash
git clone <your-repo-url>
cd Heaven_Bakers
```

## 2) Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend` (recommended):
```env
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/Heaven_Bakers
JWT_SECRET=dev-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```
Notes:
- If `.env` is omitted, defaults are used: `PORT=5000`, `DATABASE_URL=postgres://postgres:postgres@localhost:5432/Heaven_Bakers`, `JWT_SECRET=dev-secret`.
- On first start, tables are auto-created and an admin user is seeded (`admin` / `admin123`).

Start the backend:
```bash
npm start
```
Backend runs at `http://localhost:5000`.

## 3) Frontend setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

## 4) Login
- Username: `admin`
- Password: `admin123`

## 5) Reports and Exports
- Open `Reports` from the top navigation.
- Use the horizontal buttons to switch between `Summary`, `Sales`, `Inventory`, and `Purchases`.
- Set `From` and `To` dates to filter.
- `Download Excel` will export the selected report. For Sales, multiple sheets are included (Summary, By Day, By Product, Invoices).
- `Download PDF` exports table-style PDFs for non-Sales reports.
- `Download Sales Detailed PDF` (visible on the Sales report) exports a narrative PDF including:
  - Date range, totals (Sales, Profit), invoices count, average per invoice
  - By Day breakdown
  - By Product breakdown
  - Per-invoice blocks with item lines (qty, unit price, revenue, profit)

## Useful scripts
- Backend: `npm start` — start server
- Frontend: `npm run dev` — start Vite dev server
- Frontend: `npm run build` — production build
- Frontend: `npm run preview` — preview the build

## Troubleshooting
- Ensure PostgreSQL is running and accessible at your `DATABASE_URL`.
- If the database doesn’t exist, the backend attempts to create it automatically.
- If login fails, restart the backend to re-run admin seeding.
- If exports fail, refresh the page and ensure you’re logged in.
