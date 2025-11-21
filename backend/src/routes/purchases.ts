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
  const { invoice_no, vendor_id, date, bill_price, qty, brand, product_id, selling_price, unit_price } = req.body as {
    invoice_no?: string;
    vendor_id: number;
    date?: string;
    bill_price: number;
    qty: number;
    brand?: string;
    product_id: number;
    selling_price?: number;
    unit_price?: number;
  };
  if (!vendor_id || !product_id) return res.status(400).send('Missing vendor_id or product_id');
  if (!qty || qty <= 0) return res.status(400).send('Invalid qty');
  if (bill_price === undefined || bill_price === null) return res.status(400).send('Missing bill_price');

  const total = Number(bill_price);
  const unit = unit_price != null ? Number(Number(unit_price).toFixed(2)) : Number((total / qty).toFixed(2));
  const selling = selling_price != null ? Number(Number(selling_price).toFixed(2)) : Number((unit * 1.3).toFixed(2));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dateOnly = date ? String(date).slice(0,10) : new Date().toISOString().slice(0,10);
    const pr = await client.query(
      `INSERT INTO purchases (invoice_no, vendor_id, date, purchase_date, bill_price, unit_price, selling_price) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING purchase_id, invoice_no, vendor_id, purchase_date, bill_price, unit_price, selling_price`,
      [invoice_no || null, vendor_id, (date ? new Date(date) : new Date()), dateOnly, total, unit, selling]
    );
    const purchase_id = pr.rows[0].purchase_id;
    const ir = await client.query(
      `INSERT INTO purchase_items (purchase_id, product_id, qty, total_price, unit_price, brand, selling_price, remaining_qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING purchase_item_id, purchase_id, product_id, qty, total_price, unit_price, brand, selling_price, remaining_qty`,
      [purchase_id, product_id, qty, total, unit, brand || null, selling, qty]
    );
    const invExist = await client.query(
      `SELECT inventory_id, product_id, vendor_id, brand, qty
       FROM inventory_items
       WHERE product_id = $1 AND vendor_id = $2 AND (brand IS NOT DISTINCT FROM $3)
       LIMIT 1`,
      [product_id, vendor_id, brand || null]
    );
    let inv;
    if (invExist.rows[0]) {
      inv = invExist;
    } else {
      inv = await client.query(
        `INSERT INTO inventory_items (product_id, vendor_id, brand, qty)
         VALUES ($1, $2, $3, $4)
         RETURNING inventory_id, product_id, vendor_id, brand, qty`,
        [product_id, vendor_id, brand || null, qty]
      );
    }
    await client.query(
      `UPDATE inventory_items SET qty = (
        SELECT COALESCE(SUM(pi.remaining_qty),0)
        FROM purchase_items pi
        JOIN purchases p ON p.purchase_id = pi.purchase_id
        WHERE pi.product_id = $1 AND p.vendor_id = $2 AND (pi.brand IS NOT DISTINCT FROM $3)
      ) WHERE product_id = $1 AND vendor_id = $2 AND (brand IS NOT DISTINCT FROM $3)`,
      [product_id, vendor_id, brand || null]
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
      `SELECT p.purchase_id, p.invoice_no, p.vendor_id, p.date, p.purchase_date, p.bill_price, p.unit_price, p.selling_price, v.name as vendor_name
       FROM purchases p
       LEFT JOIN vendors v ON v.vendor_id = p.vendor_id
       ORDER BY p.purchase_id DESC`
    );
    const ids = pr.rows.map(r => r.purchase_id);
    let items: any[] = [];
    if (ids.length > 0) {
      const ir = await pool.query(
        `SELECT purchase_item_id, purchase_id, product_id, qty, total_price, unit_price, brand, selling_price
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