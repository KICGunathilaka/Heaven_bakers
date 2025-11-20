import { Router } from 'express'
import { pool } from '../db'
import jwt from 'jsonwebtoken'

const router = Router()

function requireAuth(req: any, res: any) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const secret = process.env.JWT_SECRET
  if (!secret) { res.status(500).send('Server misconfigured'); return false }
  if (!token) { res.status(401).send('Unauthorized'); return false }
  try { jwt.verify(token, secret); return true } catch { res.status(401).send('Unauthorized'); return false }
}

router.get('/', async (req, res) => {
  if (!requireAuth(req, res)) return
  try {
    const r = await pool.query('SELECT customer_id, name, contact_no, nic, address, joined_date, created_at FROM customers ORDER BY customer_id DESC')
    res.json({ customers: r.rows })
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error')
  }
})

router.post('/', async (req, res) => {
  if (!requireAuth(req, res)) return
  const { name, mobile_no, nic, address, joined_date } = req.body as { name: string; mobile_no?: string; nic?: string; address?: string; joined_date?: string }
  if (!name) return res.status(400).send('Missing name')
  try {
    const r = await pool.query(
      `INSERT INTO customers (name, contact_no, nic, address, joined_date) VALUES ($1, $2, $3, $4, $5)
       RETURNING customer_id, name, contact_no, nic, address, joined_date, created_at`,
      [name, mobile_no || null, nic || null, address || null, joined_date ? new Date(joined_date) : null]
    )
    res.json({ customer: r.rows[0] })
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error')
  }
})

export default router