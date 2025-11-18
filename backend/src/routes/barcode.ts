import { Router } from 'express';
import { pool } from '../db';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).send('Server misconfigured');
  if (!token) return res.status(401).send('Unauthorized');
  try {
    jwt.verify(token, secret);
  } catch {
    return res.status(401).send('Unauthorized');
  }

  const { product_id, barcode } = req.body as { product_id: number; barcode: string };
  if (!product_id || !barcode) return res.status(400).send('Missing product_id or barcode');
  try {
    const r = await pool.query(
      `INSERT INTO barcode (product_id, barcode) VALUES ($1, $2)
       RETURNING barcode_id, product_id, barcode, created_at`,
      [product_id, barcode]
    );
    res.json({ barcode: r.rows[0] });
  } catch (e: any) {
    if (e?.code === '23503') {
      return res.status(400).send('Invalid product_id');
    }
    if (e?.code === '23505') {
      return res.status(409).send('Barcode already exists');
    }
    res.status(500).send(e?.message || 'Server error');
  }
});

export default router;