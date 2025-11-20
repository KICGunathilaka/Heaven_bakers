import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';

const roseGold = '#b76e79';
const roseGoldLight = '#e6c3c8';
const gold = '#d4af37';
const goldHover = '#c9a227';

export default function Expenses() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [expenses, setExpenses] = useState<Array<{ expense_id: number; name: string; amount: number; note: string | null }>>([]);

  function logout() { localStorage.removeItem('token'); navigate('/login', { replace: true }); }
  function goHome() { navigate('/dashboard'); }

  useEffect(() => {
    (async () => {
      try {
        const r = await get('/expenses');
        setExpenses(r.expenses || []);
      } catch (err: any) { if (err?.status === 401) { navigate('/login', { replace: true }); } }
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!name) { setError('Enter name'); return; }
    if (!amount || isNaN(amt) || amt < 0) { setError('Enter valid amount'); return; }
    try {
      await post('/expenses', { name, amount: amt, note: note || undefined });
      try { const r = await get('/expenses'); setExpenses(r.expenses || []); } catch {}
      setName(''); setAmount(''); setNote(''); setShowForm(false);
    } catch (err: any) {
      if (err?.status === 401) { localStorage.removeItem('token'); navigate('/login', { replace: true }); return; }
      setError(err?.message || 'Failed to add expense');
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', padding: 12, position: 'sticky', top: 0,
        background: `linear-gradient(90deg, ${roseGold}, ${roseGoldLight})`, color: '#fff', borderBottom: `1px solid ${roseGoldLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontWeight: 700, fontSize: 24 }}>Expenses</div>
        
        <div style={{ flex: 1 }} />
        <button onClick={goHome} style={{ background: gold, color: '#000', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }} onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}>Home</button>
        <button onClick={logout} style={{ background: gold, color: '#000', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }} onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}>Logout</button>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
            onMouseLeave={e => (e.currentTarget.style.background = gold)}
          >
            {showForm ? 'Close' : 'Add Expense'}
          </button>
        </div>
        {showForm && (
          <form onSubmit={submit} style={{ borderRadius: 12, padding: 16, width: '100%', maxWidth: 520, background: 'linear-gradient(135deg, #f8e7a5, #fff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', boxSizing: 'border-box', marginBottom: 16 }}>
            {error && (<div style={{ color: 'red', marginBottom: 12 }}>{error}</div>)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
                <select value={name} onChange={e=>setName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>
                  <option value="Rent">Rent</option>
                  <option value="Employee Salary">Employee Salary</option>
                  <option value="Foods">Foods</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Amount</label>
                <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Note</label>
                <input value={note} onChange={e=>setNote(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => (e.currentTarget.style.background = goldHover)} onMouseLeave={e => (e.currentTarget.style.background = gold)}>Save Expense</button>
            </div>
          </form>
        )}
        {!showForm && (
          <div>
            <div style={{ fontWeight: 700, color: roseGold, marginBottom: 8 }}>Recent Expenses</div>
            {expenses.length === 0 ? (
              <div style={{ fontSize: 12, color: '#777' }}>No expenses yet</div>
            ) : (
              expenses.slice(0, 20).map(ex => (
                <div key={ex.expense_id} style={{ borderRadius: 8, padding: 12, background: 'linear-gradient(135deg, #f8e7a5, #fff)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{ex.amount?.toFixed?.(2) ?? ex.amount}</div>
                  </div>
                  {ex.note ? (<div style={{ fontSize: 12, color: '#555' }}>{ex.note}</div>) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}