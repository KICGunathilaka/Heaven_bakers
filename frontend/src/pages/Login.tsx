import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const roseGold = '#b76e79';
  const gold = '#d4af37';
  const goldHover = '#c9a227';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await post('/auth/login', { username, password });
      localStorage.setItem('token', res.token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24, border: `1px solid ${roseGold}`, borderRadius: 12, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
      <h2 style={{ color: roseGold }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} style={{ width: '100%', padding: 8 }} required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} required />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, background: gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}