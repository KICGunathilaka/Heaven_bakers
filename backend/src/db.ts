import { Pool } from 'pg';

const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/Heaven_Bakers';
export const pool = new Pool({ connectionString: url });