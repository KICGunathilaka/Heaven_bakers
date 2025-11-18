import { Router } from 'express';
import { pool } from '../db';
import jwt from 'jsonwebtoken';

const router = Router();

function requireAuth(req: any, res: any) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const secret = process.env.JWT_SECRET;
  if (!secret) { res.status(500).send('Server misconfigured'); return false; }
  if (!token) { res.status(401).send('Unauthorized'); return false; }
  try { jwt.verify(token, secret); return true; } catch { res.status(401).send('Unauthorized'); return false; }
}

router.get('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const r = await pool.query('SELECT vendor_id, name, contact_no1, contact_no2, email, address FROM vendors ORDER BY vendor_id DESC');
    res.json({ vendors: r.rows });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

router.post('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { name, contact_no1, contact_no2, email, address } = req.body as {
    name: string; contact_no1?: string; contact_no2?: string; email?: string; address?: string;
  };
  if (!name) return res.status(400).send('Missing name');
  try {
    const r = await pool.query(
      `INSERT INTO vendors (name, contact_no1, contact_no2, email, address) VALUES ($1, $2, $3, $4, $5)
       RETURNING vendor_id, name, contact_no1, contact_no2, email, address`,
      [name, contact_no1 || null, contact_no2 || null, email || null, address || null]
    );
    res.json({ vendor: r.rows[0] });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

router.put('/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const id = Number(req.params.id);
  if (!id) return res.status(400).send('Invalid id');
  const { name, contact_no1, contact_no2, email, address } = req.body as {
    name: string; contact_no1?: string; contact_no2?: string; email?: string; address?: string;
  };
  if (!name) return res.status(400).send('Missing name');
  try {
    const r = await pool.query(
      `UPDATE vendors SET name=$1, contact_no1=$2, contact_no2=$3, email=$4, address=$5 WHERE vendor_id=$6
       RETURNING vendor_id, name, contact_no1, contact_no2, email, address`,
      [name, contact_no1 || null, contact_no2 || null, email || null, address || null, id]
    );
    if (r.rowCount === 0) return res.status(404).send('Not found');
    res.json({ vendor: r.rows[0] });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

export default router;