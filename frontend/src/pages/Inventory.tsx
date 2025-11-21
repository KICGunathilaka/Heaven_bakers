import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../services/api';

const roseGold = '#b76e79';
const roseGoldLight = '#e6c3c8';
const gold = '#d4af37';
const goldHover = '#c9a227';

export default function Inventory() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Array<{ purchase_item_id: number; inventory_id: number; product_id: number; product_name: string | null; sku: string | null; vendor_id: number; vendor_name: string | null; brand: string | null; qty: number | string; purchase_date: string | null }>>([]);
  const [qProduct, setQProduct] = useState('');
  const [qVendor, setQVendor] = useState('');
  const [qBrand, setQBrand] = useState('');

  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }
  function goHome() { navigate('/dashboard'); }

  useEffect(() => {
    (async () => {
      try {
        const r = await get('/inventory');
        setInventory(r.inventory || []);
      } catch (err: any) { if (err?.status === 401) { navigate('/login', { replace: true }); } }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    return inventory
      .filter(i => !qProduct || (i.product_name || '').toLowerCase().includes(qProduct.toLowerCase()))
      .filter(i => !qVendor || (i.vendor_name || '').toLowerCase().includes(qVendor.toLowerCase()))
      .filter(i => !qBrand || (i.brand || '').toLowerCase().includes(qBrand.toLowerCase()));
  }, [inventory, qProduct, qVendor, qBrand]);

  return (
    <div>
      <div style={{
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
      }}>
        <div style={{ fontWeight: 700, fontSize: 24 }}>Inventory</div>
        
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Filter by product" value={qProduct} onChange={e=>setQProduct(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Filter by vendor" value={qVendor} onChange={e=>setQVendor(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Filter by brand" value={qBrand} onChange={e=>setQBrand(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
          </div>
        </div>
      {filtered.length === 0 ? (
        <div style={{ color: '#666' }}>No inventory items.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {filtered.map(i => {
            const disp = (() => {
              const q = typeof i.qty === 'string' ? Number(i.qty) : Number(i.qty);
              if ((i.sku || '') === 'Grams') {
                if (q >= 1000) return { value: (q / 1000).toFixed(2), unit: 'KG' };
                return { value: q.toFixed(2), unit: 'g' };
              }
              return { value: q.toFixed(2), unit: '' };
            })();
            return (
              <div key={i.purchase_item_id || i.inventory_id} style={{ borderRadius: 10, padding: 14, background: 'linear-gradient(135deg, #f8e7a5, #fff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: roseGold }}>
                    {(i.product_name || 'Unknown')}{i.purchase_date ? ` (Purchased: ${(() => { const d = new Date(i.purchase_date as string); return isNaN(d.getTime()) ? String(i.purchase_date).slice(0,10) : d.toLocaleDateString('en-CA'); })()})` : ''}
                  </div>
                  <div style={{ background: roseGoldLight, color: '#222', borderRadius: 18, padding: '6px 12px', fontWeight: 700, minWidth: 120, textAlign: 'center' }}>
                    {disp.value} {disp.unit}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#555', fontSize: 12 }}>
                  <div>Vendor: {i.vendor_name || '-'}</div>
                  <div>Brand: {i.brand || '-'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}