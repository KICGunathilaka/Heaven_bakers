import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, get } from '../services/api';

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [items, setItems] = useState<Array<{ product_id: number; product_name: string; sku: string | null; category: string | null }>>([]);
  const [barcodeProductId, setBarcodeProductId] = useState<number | ''>('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [filterId, setFilterId] = useState('');
  const categories = [
    'Baking Essentials',
    'Sugars & Sweeteners',
    'Dairy & Fats',
    'Chocolate & Cocoa Products',
    'Food Colors & Flavours',
    'Cake Mixes & Premixes',
    'Decorations & Toppings',
    'Frostings & Creams',
    'Fillings & Sauces',
    'Nuts & Dried Fruits',
    'Packaging Materials',
    'Tools & Equipment'
  ];

  const roseGold = '#b76e79';
  const roseGoldLight = '#d9a1aa';
  const gold = '#d4af37';
  const goldHover = '#c9a227';
  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }
  function goHome() {
    navigate('/dashboard');
  }

  function toggleForm() {
    setShowForm(v => !v);
  }

  async function fetchProducts() {
    try {
      const data = await get('/products');
      setItems(data.products || []);
    } catch (err: any) {
      if (err?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await post('/products', { product_name: productName, sku, category });
      setConfirmVisible(true);
      setTimeout(() => setConfirmVisible(false), 700);
      setProductName('');
      setSku('');
      setCategory('');
      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      if (err?.status === 401 || /Unauthorized/i.test(err?.message || '')) {
        navigate('/login', { replace: true });
        return;
      }
      setError(err?.message || 'Failed to save product');
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <style>
        {`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}
      </style>
      {confirmVisible && (
        <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${roseGoldLight}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <span style={{ fontSize: 24 }}>🎂</span>
            <span style={{ color: roseGold, fontWeight: 600 }}>Product saved</span>
            <div style={{ width: 18, height: 18, border: '3px solid #eee', borderTopColor: gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        </div>
      )}
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 16
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 24 }}>Products</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={goHome}
          style={{
            background: gold,
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
        >
          Home
        </button>
        <button
          onClick={logout}
          style={{
            background: gold,
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
        >
          Logout
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{
          border: `1px solid ${roseGoldLight}`,
          borderRadius: 12,
          padding: 16,
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
          marginBottom: 16
        }}>
          {error && (<div style={{ color: 'red', marginBottom: 12 }}>{error}</div>)}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Product Name</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>SKU</label>
            <select
              value={sku}
              onChange={e => setSku(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="">Select...</option>
              <option value="Grams">Grams</option>
              <option value="PCS">PCS</option>
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff' }}
            >
              <option value="">Select...</option>
              <option>Baking Essentials</option>
              <option>Sugars & Sweeteners</option>
              <option>Dairy & Fats</option>
              <option>Chocolate & Cocoa Products</option>
              <option>Food Colors & Flavours</option>
              <option>Cake Mixes & Premixes</option>
              <option>Decorations & Toppings</option>
              <option>Frostings & Creams</option>
              <option>Fillings & Sauces</option>
              <option>Nuts & Dried Fruits</option>
              <option>Packaging Materials</option>
              <option>Tools & Equipment</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              background: gold,
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
            onMouseLeave={e => (e.currentTarget.style.background = gold)}
          >
            Save Product
          </button>
        </form>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={toggleForm}
          style={{
            background: gold,
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
        >
          {showForm ? 'Close' : 'Add Product'}
        </button>
      </div>

      {!showForm && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div>

          <div style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input
                placeholder="Search by name"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                style={{ flex: 2, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <input
                placeholder="Search by ID"
                value={filterId}
                onChange={e => setFilterId(e.target.value)}
                type="number"
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterSku}
                onChange={e => setFilterSku(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">All SKUs</option>
                <option value="Grams">Grams</option>
                <option value="PCS">PCS</option>
              </select>
            </div>

            {items.length === 0 ? (
              <p>No products yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {items
                  .filter(it => !filterText || it.product_name.toLowerCase().includes(filterText.toLowerCase()))
                  .filter(it => !filterId || it.product_id === Number(filterId))
                  .filter(it => !filterCategory || it.category === filterCategory)
                  .filter(it => !filterSku || it.sku === filterSku)
                  .map(it => (
                  <div key={it.product_id} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                    <div style={{ fontWeight: 700, color: roseGold }}>{it.product_name}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>SKU: {it.sku || '-'}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>Category: {it.category || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: roseGold, marginBottom: 12 }}>Generate Barcode</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Select Product</label>
              <select
                value={barcodeProductId === '' ? '' : String(barcodeProductId)}
                onChange={e => {
                  const v = e.target.value;
                  setBarcodeProductId(v ? Number(v) : '');
                }}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">Select...</option>
                {items.map(it => (
                  <option key={it.product_id} value={it.product_id}>{it.product_name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Barcode</label>
              <input
                value={barcodeValue}
                onChange={e => setBarcodeValue(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={async () => {
                const pid = barcodeProductId === '' ? 0 : barcodeProductId;
                const bc = String(barcodeValue || '').trim();
                if (!pid || !bc) { alert('Select a product and enter barcode'); return; }
                try {
                  const data = await post('/barcode', { product_id: pid, barcode: bc });
                  setConfirmVisible(true);
                  setTimeout(() => setConfirmVisible(false), 700);
                  setBarcodeProductId('');
                  setBarcodeValue('');
                } catch (err: any) {
                  alert(err?.message || 'Failed to generate barcode');
                }
              }}
              style={{
                background: gold,
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
              onMouseLeave={e => (e.currentTarget.style.background = gold)}
            >
              Save Barcode
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}