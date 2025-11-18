import { Router } from 'express';
import { pool } from '../db';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/', async (req, res) => {
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

  try {
    const r = await pool.query('SELECT product_id, product_name, sku, category FROM products ORDER BY product_id DESC');
    res.json({ products: r.rows });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

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

  const { product_name, sku, category } = req.body as {
    product_name: string; sku?: string; category?: string;
  };
  if (!product_name) return res.status(400).send('Missing product_name');
  try {
    const r = await pool.query(
      `INSERT INTO products (product_name, sku, category) VALUES ($1, $2, $3)
       RETURNING product_id, product_name, sku, category`,
      [product_name, sku || null, category || null]
    );
    res.json({ product: r.rows[0] });
  } catch (e: any) {
    if (e?.code === '23505') {
      return res.status(409).send('Conflict');
    }
    res.status(500).send(e?.message || 'Server error');
  }
});

export default router;