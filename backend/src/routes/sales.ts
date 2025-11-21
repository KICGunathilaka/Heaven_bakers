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

function roundUpToNearest5(n: number) {
  return Math.ceil(n / 5) * 5;
}

router.get('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const r = await pool.query(
      `SELECT s.sale_id, s.sale_invoice_no, s.date, s.total_amount, s.discount, s.note,
              c.customer_id, c.name as customer_name, c.contact_no, c.address,
              si.sales_item_id, si.inventory_id, si.qty, si.brand, si.unit_price, si.selling_price, si.profit
       FROM sales s
       LEFT JOIN customers c ON c.customer_id = s.customer_id
       LEFT JOIN sales_items si ON si.sale_id = s.sale_id
       ORDER BY s.sale_id DESC`
    );
    res.json({ sales: r.rows });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

router.post('/', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sale_invoice_no, customer_name, contact_no, address, date, total_amount, discount, note, items, inventory_id, qty, brand } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let customerId: number | null = null;
    if (customer_name) {
      const c1 = await client.query(`SELECT customer_id FROM customers WHERE name = $1 AND (contact_no IS NOT DISTINCT FROM $2)`, [customer_name, contact_no || null]);
      if (c1.rows[0]) customerId = c1.rows[0].customer_id;
      else {
        const c2 = await client.query(`INSERT INTO customers (name, contact_no, address) VALUES ($1, $2, $3) RETURNING customer_id`, [customer_name, contact_no || null, address || null]);
        customerId = c2.rows[0].customer_id;
      }
    }

    const saleRes = await client.query(
      `INSERT INTO sales (sale_invoice_no, customer_id, date, total_amount, discount, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING sale_id, sale_invoice_no, customer_id, date, total_amount, discount, note`,
      [sale_invoice_no || null, customerId, date ? new Date(date) : new Date(), null, discount ? Number(discount) : null, note || null]
    );
    const saleId = saleRes.rows[0].sale_id;

    const payloadItems: any[] = Array.isArray(items) && items.length > 0
      ? items
      : (inventory_id || (req.body?.barcode)) ? [{ inventory_id, qty, brand, barcode: (req.body as any).barcode }] : [];

    let total = 0;
    const insertedItems: any[] = [];

    for (const it of payloadItems) {
      let inventoryId: number | null = null;
      let productId: number | null = null;
      let vendorId: number | null = null;
      let brandVal: string | null = null;
      let sku: string | null = null;
      let unitPrice = 0;
      let purchaseIdForItem: number | null = null;
      let sellingFromBatch: number | null = null;

      if (it.barcode) {
        const code = String(it.barcode).trim();
        const br = await client.query(`SELECT product_id, invoice_no, brand FROM barcode WHERE barcode = $1`, [code]);
        let parsedProductId: number | null = null;
        let parsedPurchaseId: number | null = null;
        let parsedInvoiceNo: string | null = null;
        let parsedBrand: string | null = null;
        const mBrand = /^BC-(\d+)-(\d+)-([^\-]+)-(.*)$/.exec(code);
        const mInvoiceOnly = /^BC-(\d+)-(\d+)-(.*)$/.exec(code);
        const mBasic = /^BC-(\d+)-(\d+)$/.exec(code);
        if (mBrand) {
          parsedProductId = Number(mBrand[1]);
          parsedPurchaseId = Number(mBrand[2]);
          parsedBrand = (mBrand[3] || '').trim() || null;
          parsedInvoiceNo = (mBrand[4] || '').trim() || null;
        } else if (mInvoiceOnly) {
          parsedProductId = Number(mInvoiceOnly[1]);
          parsedPurchaseId = Number(mInvoiceOnly[2]);
          parsedInvoiceNo = (mInvoiceOnly[3] || '').trim() || null;
        } else if (mBasic) {
          parsedProductId = Number(mBasic[1]);
          parsedPurchaseId = Number(mBasic[2]);
        }
        const b = br.rows[0] || {};
        purchaseIdForItem = parsedPurchaseId || null;
        productId = (b.product_id ?? parsedProductId) as number;
        let prRow: any = null;
        if (purchaseIdForItem) {
          const pr = await client.query(`SELECT purchase_id, vendor_id, invoice_no FROM purchases WHERE purchase_id = $1`, [purchaseIdForItem]);
          prRow = pr.rows[0] || null;
        }
        if (!prRow && (parsedInvoiceNo || b.invoice_no)) {
          const pr2 = await client.query(`SELECT purchase_id, vendor_id, invoice_no FROM purchases WHERE invoice_no = $1 ORDER BY purchase_id DESC LIMIT 1`, [parsedInvoiceNo || b.invoice_no]);
          prRow = pr2.rows[0] || null;
          purchaseIdForItem = prRow?.purchase_id || purchaseIdForItem;
        }
        if (!prRow) throw new Error('Invalid barcode purchase');
        vendorId = prRow.vendor_id;
        const pi = await client.query(`
          SELECT unit_price, brand, selling_price
          FROM purchase_items
          WHERE purchase_id = $1 AND product_id = $2
          ORDER BY purchase_item_id DESC
          LIMIT 1
        `, [purchaseIdForItem, productId]);
        brandVal = (b.brand || null) ?? parsedBrand ?? (pi.rows[0]?.brand || null);
        unitPrice = pi.rows[0]?.unit_price ? Number(pi.rows[0].unit_price) : 0;
        sellingFromBatch = pi.rows[0]?.selling_price != null ? Number(pi.rows[0].selling_price) : null;
        const invByPB = await client.query(`
          SELECT i.inventory_id, i.product_id, i.vendor_id, i.brand, p.sku
          FROM inventory_items i
          LEFT JOIN products p ON p.product_id = i.product_id
          WHERE i.product_id = $1 AND i.vendor_id = $2 AND (i.brand IS NOT DISTINCT FROM $3)
        `, [productId, vendorId, brandVal]);
        if (!invByPB.rows[0]) throw new Error('Inventory item not found for barcode');
        inventoryId = invByPB.rows[0].inventory_id;
        sku = invByPB.rows[0].sku || null;
      } else {
        const inv = await client.query(`
          SELECT i.inventory_id, i.product_id, i.vendor_id, i.brand, p.sku
          FROM inventory_items i
          LEFT JOIN products p ON p.product_id = i.product_id
          WHERE i.inventory_id = $1
        `, [it.inventory_id]);
        if (!inv.rows[0]) throw new Error('Invalid inventory item');
        const ip = inv.rows[0];
        inventoryId = ip.inventory_id;
        productId = ip.product_id;
        vendorId = ip.vendor_id;
        brandVal = it.brand || ip.brand || null;
        const hasDate = typeof it.purchase_date === 'string' && it.purchase_date.length >= 10;
        const pu = await client.query(
          `SELECT pi.unit_price, pi.selling_price
           FROM purchase_items pi
           JOIN purchases p ON p.purchase_id = pi.purchase_id
           WHERE pi.product_id = $1 AND p.vendor_id = $2 AND (pi.brand IS NOT DISTINCT FROM $3)
             ${hasDate ? 'AND p.purchase_date = $4' : ''}
           ORDER BY pi.purchase_item_id DESC
           LIMIT 1`,
          hasDate ? [productId, vendorId, brandVal, (it.purchase_date as string).slice(0,10)] : [productId, vendorId, brandVal]
        );
        unitPrice = pu.rows[0]?.unit_price ? Number(pu.rows[0].unit_price) : 0;
        sellingFromBatch = pu.rows[0]?.selling_price != null ? Number(pu.rows[0].selling_price) : null;
        sku = ip.sku || null;
      }

      const qtyNum = Number(it.qty);
      const brandToUse = brandVal;
      if (sku === 'Grams') {
        const perUnitSelling = (typeof sellingFromBatch === 'number' && !isNaN(sellingFromBatch)) ? sellingFromBatch : Number((unitPrice * 1.3).toFixed(2));
        const lineTotalRounded = roundUpToNearest5(perUnitSelling * qtyNum);
        const profit = (perUnitSelling - unitPrice) * qtyNum;
        const si = await client.query(
          `INSERT INTO sales_items (sale_id, inventory_id, qty, brand, unit_price, selling_price, profit)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING sales_item_id, sale_id, inventory_id, qty, brand, unit_price, selling_price, profit`,
          [saleId, inventoryId, qtyNum, brandToUse, unitPrice, perUnitSelling, profit]
        );
        insertedItems.push(si.rows[0]);
        total += lineTotalRounded;
      } else {
        const sellingPrice = (typeof sellingFromBatch === 'number' && !isNaN(sellingFromBatch)) ? sellingFromBatch : roundUpToNearest5(unitPrice * 1.3);
        const profit = (sellingPrice - unitPrice) * qtyNum;
        const si = await client.query(
          `INSERT INTO sales_items (sale_id, inventory_id, qty, brand, unit_price, selling_price, profit)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING sales_item_id, sale_id, inventory_id, qty, brand, unit_price, selling_price, profit`,
          [saleId, inventoryId, qtyNum, brandToUse, unitPrice, sellingPrice, profit]
        );
        insertedItems.push(si.rows[0]);
        total += sellingPrice * qtyNum;
      }
      let needQty = qtyNum;
      const hasDateFilter = typeof it.purchase_date === 'string' && it.purchase_date.length >= 10;
      const batches = await client.query(
        `SELECT pi.purchase_item_id, pi.remaining_qty, p.purchase_date
         FROM purchase_items pi
         JOIN purchases p ON p.purchase_id = pi.purchase_id
         WHERE pi.product_id = $1 AND p.vendor_id = $2 AND (pi.brand IS NOT DISTINCT FROM $3)
           AND COALESCE(pi.remaining_qty, 0) > 0
           ${purchaseIdForItem ? 'AND pi.purchase_id = $4' : ''}
           ${!purchaseIdForItem && hasDateFilter ? 'AND p.purchase_date = $4' : ''}
         ORDER BY p.purchase_date ASC, pi.purchase_item_id ASC`,
        purchaseIdForItem ? [productId, vendorId, brandToUse, purchaseIdForItem] : (hasDateFilter ? [productId, vendorId, brandToUse, (it.purchase_date as string).slice(0,10)] : [productId, vendorId, brandToUse])
      );
      let totalAvailable = 0;
      for (const b of batches.rows) totalAvailable += Number(b.remaining_qty || 0);
      if (needQty > totalAvailable) throw new Error('Insufficient stock');
      for (const b of batches.rows) {
        if (needQty <= 0) break;
        const rem = Number(b.remaining_qty || 0);
        if (rem <= 0) continue;
        const consume = Math.min(rem, needQty);
        await client.query(`UPDATE purchase_items SET remaining_qty = remaining_qty - $1 WHERE purchase_item_id = $2`, [consume, b.purchase_item_id]);
        needQty -= consume;
      }
      await client.query(
        `UPDATE inventory_items SET qty = (
          SELECT COALESCE(SUM(pi.remaining_qty),0)
          FROM purchase_items pi
          JOIN purchases p ON p.purchase_id = pi.purchase_id
          WHERE pi.product_id = $1 AND p.vendor_id = $2 AND (pi.brand IS NOT DISTINCT FROM $3)
        ) WHERE inventory_id = $4`,
        [productId, vendorId, brandToUse, inventoryId]
      );
    }

    const finalTotal = total_amount ? Number(total_amount) : (discount ? Number((total * (1 - (Number(discount) / 100))).toFixed(2)) : total);
    const upd = await client.query(`UPDATE sales SET total_amount = $1 WHERE sale_id = $2 RETURNING sale_id, sale_invoice_no, customer_id, date, total_amount, discount, note`, [finalTotal, saleId]);

    await client.query('COMMIT');
    res.json({ sale: upd.rows[0], items: insertedItems });
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(500).send(e?.message || 'Server error');
  } finally {
    client.release();
  }
});

export default router;