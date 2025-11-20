import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, get, put } from '../services/api';

export default function Vendors() {
  const navigate = useNavigate();
  const roseGold = '#b76e79';
  const roseGoldLight = '#d9a1aa';
  const gold = '#d4af37';
  const goldHover = '#c9a227';

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Array<{ vendor_id: number; name: string; contact_no1: string | null; contact_no2: string | null; email: string | null; address: string | null }>>([]);
  const [filterText, setFilterText] = useState('');
  const [filterId, setFilterId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMode, setEditingMode] = useState(false);

  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }
  function goHome() { navigate('/dashboard'); }
  function toggleForm() { setShowForm(v => !v); }

  function startEdit(v: { vendor_id: number; name: string; contact_no1: string | null; contact_no2: string | null; email: string | null; address: string | null }) {
    setEditingId(v.vendor_id);
    setEditingMode(true);
    setName(v.name || '');
    setContact1(v.contact_no1 || '');
    setContact2(v.contact_no2 || '');
    setEmail(v.email || '');
    setAddress(v.address || '');
    setError('');
    setShowForm(true);
  }

  async function fetchVendors() {
    try {
      const data = await get('/vendors');
      setVendors(data.vendors || []);
    } catch (err: any) {
      if (err?.status === 401) navigate('/login', { replace: true });
    }
  }

  useEffect(() => { fetchVendors(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingMode && editingId !== null) {
        await put(`/vendors/${editingId}`, { name, contact_no1: contact1, contact_no2: contact2, email, address });
      } else {
        await post('/vendors', { name, contact_no1: contact1, contact_no2: contact2, email, address });
      }
      setName(''); setContact1(''); setContact2(''); setEmail(''); setAddress('');
      setShowForm(false);
      setEditingMode(false);
      setEditingId(null);
      fetchVendors();
    } catch (err: any) {
      setError(err?.message || 'Failed to save vendor');
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: 12,
          position: 'sticky',
          top: 0,
          background: `linear-gradient(90deg, ${roseGold}, ${roseGoldLight})`,
          color: '#fff',
          borderBottom: `1px solid ${roseGoldLight}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 24 }}>Vendors</div>
        
        <div style={{ flex: 1 }} />
        <button
          onClick={goHome}
          style={{
            background: gold,
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }}
          onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}
        >
          Home
        </button>
        <button
          onClick={logout}
          style={{
            background: gold,
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }}
          onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}
        >
          Logout
        </button>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={toggleForm}
            style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
            onMouseLeave={e => (e.currentTarget.style.background = gold)}
          >
            {showForm ? 'Close' : 'Add Vendor'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} style={{ borderRadius: 12, padding: 16, width: '100%', maxWidth: 520, background: 'linear-gradient(135deg, #f8e7a5, #fff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', boxSizing: 'border-box', marginBottom: 16 }}>
            {error && (<div style={{ color: 'red', marginBottom: 12 }}>{error}</div>)}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Contact No 1</label>
                <input value={contact1} onChange={e=>setContact1(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Contact No 2</label>
                <input value={contact2} onChange={e=>setContact2(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', minHeight: 80 }} />
            </div>
            <button type="submit" style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => (e.currentTarget.style.background = goldHover)} onMouseLeave={e => (e.currentTarget.style.background = gold)}>{editingMode ? 'Update Vendor' : 'Save Vendor'}</button>
          </form>
        )}

        {!showForm && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input placeholder="Search by name" value={filterText} onChange={e=>setFilterText(e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Search by ID" value={filterId} onChange={e=>setFilterId(e.target.value)} type="number" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
            </div>
            {vendors.length === 0 ? (
              <p>No vendors yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {vendors
                  .filter(v => !filterText || v.name.toLowerCase().includes(filterText.toLowerCase()))
                  .filter(v => !filterId || v.vendor_id === Number(filterId))
                  .map(v => (
                    <div key={v.vendor_id} onClick={() => startEdit(v)} style={{ borderRadius: 8, padding: 12, background: 'linear-gradient(135deg, #f8e7a5, #fff)', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, color: roseGold }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>Contact 1: {v.contact_no1 || '-'}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>Contact 2: {v.contact_no2 || '-'}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>Email: {v.email || '-'}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>Address: {v.address || '-'}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}