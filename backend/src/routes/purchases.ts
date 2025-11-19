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

router.post('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { invoice_no, vendor_id, date, bill_price, qty, brand, product_id } = req.body as {
    invoice_no?: string;
    vendor_id: number;
    date?: string;
    bill_price: number;
    qty: number;
    brand?: string;
    product_id: number;
  };
  if (!vendor_id || !product_id) return res.status(400).send('Missing vendor_id or product_id');
  if (!qty || qty <= 0) return res.status(400).send('Invalid qty');
  if (bill_price === undefined || bill_price === null) return res.status(400).send('Missing bill_price');

  const total = Number(bill_price);
  const unit = Number((total / qty).toFixed(2));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pr = await client.query(
      `INSERT INTO purchases (invoice_no, vendor_id, date, bill_price) VALUES ($1, $2, $3, $4)
       RETURNING purchase_id, invoice_no, vendor_id, date, bill_price`,
      [invoice_no || null, vendor_id, date ? new Date(date) : new Date(), total]
    );
    const purchase_id = pr.rows[0].purchase_id;
    const ir = await client.query(
      `INSERT INTO purchase_items (purchase_id, product_id, qty, total_price, unit_price, brand)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING purchase_item_id, purchase_id, product_id, qty, total_price, unit_price, brand`,
      [purchase_id, product_id, qty, total, unit, brand || null]
    );
    const inv = await client.query(
      `INSERT INTO inventory_items (product_id, vendor_id, brand, qty)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, vendor_id, brand)
       DO UPDATE SET qty = inventory_items.qty + EXCLUDED.qty
       RETURNING inventory_id, product_id, vendor_id, brand, qty`,
      [product_id, vendor_id, brand || null, qty]
    );
    await client.query('COMMIT');
    res.json({ purchase: pr.rows[0], item: ir.rows[0], inventory: inv.rows[0] });
  } catch (e: any) {
    await client.query('ROLLBACK');
    if (e?.code === '23503') { return res.status(400).send('Invalid vendor_id or product_id'); }
    res.status(500).send(e?.message || 'Server error');
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const pr = await pool.query(
      `SELECT p.purchase_id, p.invoice_no, p.vendor_id, p.date, p.bill_price, v.name as vendor_name
       FROM purchases p
       LEFT JOIN vendors v ON v.vendor_id = p.vendor_id
       ORDER BY p.purchase_id DESC`
    );
    const ids = pr.rows.map(r => r.purchase_id);
    let items: any[] = [];
    if (ids.length > 0) {
      const ir = await pool.query(
        `SELECT purchase_item_id, purchase_id, product_id, qty, total_price, unit_price, brand
         FROM purchase_items
         WHERE purchase_id = ANY($1::int[])`
        , [ids]
      );
      items = ir.rows;
    }
    const map: Record<number, any[]> = {};
    for (const it of items) {
      (map[it.purchase_id] ||= []).push(it);
    }
    const purchases = pr.rows.map(p => ({ ...p, items: map[p.purchase_id] || [] }));
    res.json({ purchases });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

export default router;