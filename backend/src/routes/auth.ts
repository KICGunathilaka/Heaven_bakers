import { Router } from 'express';
import { pool } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/seed-admin', async (req, res) => {
  try {
    const username = 'admin';
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [username, hash]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    return res.status(400).send('Missing credentials');
  }
  const secret = process.env.JWT_SECRET || 'dev-secret';

  try {
    const r = await pool.query('SELECT user_id, username, password FROM users WHERE username=$1 LIMIT 1', [username]);
    if (r.rowCount === 0) {
      return res.status(401).send('Invalid credentials');
    }
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).send('Invalid credentials');
    }
    const token = jwt.sign({ sub: String(user.user_id), username: user.username }, secret, { expiresIn: '1h' });
    res.json({ token, user: { id: user.user_id, username: user.username } });
  } catch (e: any) {
    console.error('Login error', e);
    res.status(500).send(e?.message || 'Server error');
  }
});

export default router;