import { useState, useEffect, useMemo } from 'react';
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
  const [barcodePurchaseId, setBarcodePurchaseId] = useState<number | ''>('');
  const [barcodeBrand, setBarcodeBrand] = useState('');
  const [barcodeInvoice, setBarcodeInvoice] = useState('');
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

  const [purchases, setPurchases] = useState<Array<{ purchase_id: number; invoice_no: string | null; vendor_id: number; vendor_name?: string | null; date: string }>>([]);
  const [barcodeProductQuery, setBarcodeProductQuery] = useState('');
  const [showBarcodeProductSuggest, setShowBarcodeProductSuggest] = useState(false);
  const [barcodePurchaseQuery, setBarcodePurchaseQuery] = useState('');
  const [showBarcodePurchaseSuggest, setShowBarcodePurchaseSuggest] = useState(false);
  const filteredBarcodeProducts = useMemo(() => {
    const q = barcodeProductQuery.toLowerCase();
    return items.filter(p => p.product_name.toLowerCase().includes(q) || String(p.product_id).includes(barcodeProductQuery.trim()));
  }, [items, barcodeProductQuery]);
  const filteredBarcodePurchases = useMemo(() => {
    const q = barcodePurchaseQuery.toLowerCase();
    return purchases.filter(p => (p.invoice_no || '').toLowerCase().includes(q) || String(p.purchase_id).includes(barcodePurchaseQuery.trim()));
  }, [purchases, barcodePurchaseQuery]);
  useEffect(() => {
    (async () => {
      try {
        const r = await get('/purchases');
        setPurchases((r.purchases || []).map((p: any) => ({ purchase_id: p.purchase_id, invoice_no: p.invoice_no || null, vendor_id: p.vendor_id, vendor_name: p.vendor_name || null, date: p.date })));
      } catch (err: any) { if (err?.status === 401) navigate('/login', { replace: true }); }
    })();
  }, []);

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

        {showForm && (
        <form onSubmit={submit} style={{
          borderRadius: 12,
          padding: 16,
          width: '100%',
          maxWidth: 520,
          background: 'linear-gradient(135deg, #f8e7a5, #fff)',
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
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }}
            onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}
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
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }}
          onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}
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
                style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }}
              />
              <input
                placeholder="Search by ID"
                value={filterId}
                onChange={e => setFilterId(e.target.value)}
                type="number"
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }}
              />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', boxSizing: 'border-box', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterSku}
                onChange={e => setFilterSku(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', boxSizing: 'border-box', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }}
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
                  <div key={it.product_id} style={{ borderRadius: 8, padding: 12, background: 'linear-gradient(135deg, #f8e7a5, #fff)' }}>
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
          <div style={{ borderRadius: 12, padding: 16, background: 'linear-gradient(135deg, #f8e7a5, #fff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: roseGold, marginBottom: 12 }}>Generate Barcode</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Search Product (name or ID)</label>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search product"
                  value={barcodeProductQuery}
                  onChange={e=>{ 
                    const v = e.target.value; 
                    setBarcodeProductQuery(v); 
                    setShowBarcodeProductSuggest(true);
                    const num = Number(v);
                    if (!isNaN(num) && num > 0) {
                      const p = items.find(pp => pp.product_id === num);
                      if (p) { setBarcodeProductId(p.product_id); setBarcodeProductQuery(p.product_name); setShowBarcodeProductSuggest(false); }
                    }
                  }}
                  onFocus={()=>setShowBarcodeProductSuggest(true)}
                  onBlur={()=>setTimeout(()=>setShowBarcodeProductSuggest(false), 150)}
                  onKeyDown={e=>{ if (e.key === 'Enter' && filteredBarcodeProducts[0]) { const p=filteredBarcodeProducts[0]; setBarcodeProductId(p.product_id); setBarcodeProductQuery(p.product_name); setShowBarcodeProductSuggest(false); } }}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
                {showBarcodeProductSuggest && barcodeProductQuery && filteredBarcodeProducts.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #d9a1aa', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredBarcodeProducts.map(p => (
                      <div key={p.product_id} onMouseDown={()=>{ setBarcodeProductId(p.product_id); setBarcodeProductQuery(p.product_name); setShowBarcodeProductSuggest(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }} onMouseEnter={e=>{ e.currentTarget.style.background = '#f7f1f2'; }} onMouseLeave={e=>{ e.currentTarget.style.background = '#fff'; }}>
                        {p.product_name} [ID: {p.product_id}]
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Search Purchase (invoice or ID)</label>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search purchase"
                  value={barcodePurchaseQuery}
                  onChange={e=>{ 
                    const v = e.target.value; 
                    setBarcodePurchaseQuery(v); 
                    setShowBarcodePurchaseSuggest(true);
                    const num = Number(v);
                    if (!isNaN(num) && num > 0) {
                      const p = purchases.find(pp => pp.purchase_id === num);
                      if (p) { setBarcodePurchaseId(p.purchase_id); setBarcodeInvoice(p.invoice_no || ''); setShowBarcodePurchaseSuggest(false); }
                    }
                  }}
                  onFocus={()=>setShowBarcodePurchaseSuggest(true)}
                  onBlur={()=>setTimeout(()=>setShowBarcodePurchaseSuggest(false), 150)}
                  onKeyDown={e=>{ if (e.key === 'Enter' && filteredBarcodePurchases[0]) { const p=filteredBarcodePurchases[0]; setBarcodePurchaseId(p.purchase_id); setBarcodeInvoice(p.invoice_no || ''); setShowBarcodePurchaseSuggest(false); } }}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                />
                {showBarcodePurchaseSuggest && barcodePurchaseQuery && filteredBarcodePurchases.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #d9a1aa', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredBarcodePurchases.map(p => (
                      <div key={p.purchase_id} onMouseDown={()=>{ setBarcodePurchaseId(p.purchase_id); setBarcodeInvoice(p.invoice_no || ''); setShowBarcodePurchaseSuggest(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }} onMouseEnter={e=>{ e.currentTarget.style.background = '#f7f1f2'; }} onMouseLeave={e=>{ e.currentTarget.style.background = '#fff'; }}>
                        {(p.invoice_no || '-')} {p.vendor_name ? `(${p.vendor_name})` : ''} [ID: {p.purchase_id}]
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Brand (optional)</label>
              <input value={barcodeBrand} onChange={e=>setBarcodeBrand(e.target.value)} placeholder="e.g., Astra" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Invoice No (from purchase)</label>
              <input value={barcodeInvoice} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Barcode (auto-generated)</label>
              <input
                value={(barcodeProductId && barcodePurchaseId) ? (()=>{ const pid = barcodeProductId; const puid = barcodePurchaseId; const b = (barcodeBrand || '').replace(/\s+/g, ''); const inv = barcodeInvoice ? String(barcodeInvoice).replace(/\s+/g, '').toUpperCase() : ''; return `BC-${pid}-${puid}${b ? '-' + b : ''}${inv ? '-' + inv : ''}`; })() : ''}
                readOnly
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={async () => {
                const pid = barcodeProductId === '' ? 0 : barcodeProductId;
                const puid = barcodePurchaseId === '' ? 0 : barcodePurchaseId;
                if (!pid || !puid) { alert('Select product and purchase'); return; }
                try {
                  const b = (barcodeBrand || '').replace(/\s+/g, '');
                  const inv = barcodeInvoice ? String(barcodeInvoice).replace(/\s+/g, '').toUpperCase() : '';
                  const bcStr = `BC-${pid}-${puid}${b ? '-' + b : ''}${inv ? '-' + inv : ''}`;
                  const data = await post('/barcode', { product_id: pid, purchase_id: puid, invoice_no: barcodeInvoice || undefined, barcode: bcStr });
                  setConfirmVisible(true);
                  setTimeout(() => setConfirmVisible(false), 700);
                  setBarcodeProductId('');
                  setBarcodePurchaseId('');
                  setBarcodeBrand('');
                  setBarcodeInvoice('');
                } catch (err: any) {
                  alert(err?.message || 'Failed to generate barcode');
                }
              }}
              style={{
                background: gold,
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000' }}
              onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000' }}
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