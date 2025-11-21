import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../services/api';

export default function Purchase() {
  const navigate = useNavigate();
  const roseGold = '#b76e79';
  const roseGoldLight = '#d9a1aa';
  const gold = '#d4af37';
  const goldHover = '#c9a227';

  const [showForm, setShowForm] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [vendorQuery, setVendorQuery] = useState('');
  const [showVendorSuggest, setShowVendorSuggest] = useState(false);
  const [productId, setProductId] = useState<number | ''>('');
  const [productQuery, setProductQuery] = useState('');
  const [showProductSuggest, setShowProductSuggest] = useState(false);
  const [date, setDate] = useState<string>('');
  const [billPrice, setBillPrice] = useState<string>('');
  const [qty, setQty] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [sellingEdited, setSellingEdited] = useState(false);
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [vendors, setVendors] = useState<Array<{ vendor_id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ product_id: number; product_name: string; sku: string | null }>>([]);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [qtyUnit, setQtyUnit] = useState<'Grams' | 'KG' | 'PCS'>('PCS');
  const [purchases, setPurchases] = useState<Array<{
    purchase_id: number; invoice_no: string | null; vendor_id: number | null; vendor_name: string | null; date: string; bill_price: number;
    items: Array<{ purchase_item_id: number; product_id: number; qty: number; total_price: number; unit_price: number; brand: string | null }>
  }>>([]);
  const [fInvoice, setFInvoice] = useState('');
  const [fVendor, setFVendor] = useState('');
  const [fVendorId, setFVendorId] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [fProduct, setFProduct] = useState('');
  const [fProductId, setFProductId] = useState('');
  const [fBrand, setFBrand] = useState('');

  function logout() { localStorage.removeItem('token'); navigate('/login', { replace: true }); }
  function goHome() { navigate('/dashboard'); }
  function toggleForm() { setShowForm(v => !v); }

  useEffect(() => {
    (async () => {
      try {
        const v = await get('/vendors');
        setVendors((v.vendors || []).map((x: any) => ({ vendor_id: x.vendor_id, name: x.name })));
      } catch (err: any) { if (err?.status === 401) { navigate('/login', { replace: true }); return; } }
      try {
        const p = await get('/products');
        setProducts((p.products || []).map((x: any) => ({ product_id: x.product_id, product_name: x.product_name, sku: x.sku || null })));
    } catch (err: any) { if (err?.status === 401) { navigate('/login', { replace: true }); return; } }
      try {
        const r = await get('/purchases');
        setPurchases(r.purchases || []);
      } catch (err: any) { if (err?.status === 401) { navigate('/login', { replace: true }); return; } }
    })();
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const today = new Date().toISOString().slice(0,10);
    setDate(prev => prev || today);
    const nextInvoice = (() => {
      let maxNum = 0; let preferPrefix = 'INV-';
      for (const p of purchases) {
        const inv = p.invoice_no || '';
        const m = inv.match(/^(.*?)(\d+)$/);
        if (m) {
          const n = Number(m[2]);
          if (!isNaN(n) && n >= maxNum) { maxNum = n; preferPrefix = m[1]; }
        }
      }
      return `${preferPrefix}${maxNum + 1}`;
    })();
    setInvoiceNo(prev => prev || nextInvoice);
  }, [showForm, purchases]);

  const filteredVendors = useMemo(() => vendors.filter(v => v.name.toLowerCase().includes(vendorQuery.toLowerCase())), [vendors, vendorQuery]);
  const filteredProducts = useMemo(() => {
    const q = productQuery.toLowerCase();
    return products.filter(p => p.product_name.toLowerCase().includes(q) || String(p.product_id).includes(productQuery.trim()));
  }, [products, productQuery]);

  useEffect(() => {
    const p = products.find(pr => pr.product_id === Number(productId));
    const sku = p?.sku || null;
    setSelectedSku(sku);
    setQtyUnit(sku === 'Grams' ? 'Grams' : 'PCS');
  }, [productId, products]);

  const effectiveQty = useMemo(() => {
    const q = Number(qty);
    if (!q || isNaN(q)) return 0;
    if (selectedSku === 'Grams') {
      return qtyUnit === 'KG' ? q * 1000 : q;
    }
    return q;
  }, [qty, selectedSku, qtyUnit]);

  const unitPriceCalc = useMemo(() => {
    const totalNum = Number(billPrice);
    if (!totalNum || isNaN(totalNum) || effectiveQty <= 0) return '';
    return Number((totalNum / effectiveQty).toFixed(2));
  }, [billPrice, effectiveQty]);

  const sellingPriceCalc = useMemo(() => {
    if (typeof unitPriceCalc !== 'number' || isNaN(unitPriceCalc) || unitPriceCalc <= 0) return '';
    return Number((unitPriceCalc * 1.3).toFixed(2));
  }, [unitPriceCalc]);

  useEffect(() => {
    if (!sellingEdited) {
      setSellingPriceInput(sellingPriceCalc === '' ? '' : String(sellingPriceCalc));
    }
  }, [sellingPriceCalc, sellingEdited]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const qtyNum = Number(qty);
    const totalNum = Number(billPrice);
    if (!vendorId || !productId) { setError('Select vendor and product'); return; }
    if (!qtyNum || qtyNum <= 0) { setError('Invalid quantity'); return; }
    if (!billPrice) { setError('Enter bill price'); return; }
    try {
      const sku = selectedSku || products.find(p => p.product_id === Number(productId))?.sku || null;
      const effectiveQty = sku === 'Grams' ? (qtyUnit === 'KG' ? qtyNum * 1000 : qtyNum) : qtyNum;
      const payload = {
        invoice_no: invoiceNo || undefined,
        vendor_id: Number(vendorId),
        product_id: Number(productId),
        date: date || undefined,
        bill_price: totalNum,
        qty: effectiveQty,
        brand: brand || undefined,
        unit_price: unitPriceCalc === '' ? undefined : Number(unitPriceCalc),
        selling_price: sellingPriceInput ? Number(Number(sellingPriceInput).toFixed(2)) : undefined,
      };
      await post('/purchases', payload);
      try { const r = await get('/purchases'); setPurchases(r.purchases || []); } catch {}
      setConfirmVisible(true);
      setTimeout(() => setConfirmVisible(false), 800);
      setInvoiceNo(''); setVendorId(''); setProductId(''); setVendorQuery(''); setProductQuery(''); setDate(''); setBillPrice(''); setQty(''); setBrand('');
      setShowForm(false);
    } catch (err: any) {
      if (err?.status === 401) { navigate('/login', { replace: true }); return; }
      setError(err?.message || 'Failed to add purchase');
    }
  }

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {confirmVisible && (
        <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${roseGoldLight}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <span style={{ fontSize: 24 }}>🧾</span>
            <span style={{ color: roseGold, fontWeight: 600 }}>Purchase added</span>
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 24 }}>Purchase</div>
        
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
            {showForm ? 'Close' : 'Add Purchase'}
          </button>
        </div>
        {showForm && (
          <form
            onSubmit={submit}
            style={{
              borderRadius: 12,
              padding: 16,
              width: '100%',
              maxWidth: 520,
              background: 'linear-gradient(135deg, #f8e7a5, #fff)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              boxSizing: 'border-box',
              marginBottom: 16
            }}
          >
            {error && (<div style={{ color: 'red', marginBottom: 12 }}>{error}</div>)}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Invoice No</label>
                <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Vendor (search)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="Search vendor"
                    value={vendorQuery}
                    onChange={e=>{ setVendorQuery(e.target.value); setShowVendorSuggest(true); }}
                    onFocus={()=>setShowVendorSuggest(true)}
                    onBlur={()=>setTimeout(()=>setShowVendorSuggest(false), 150)}
                    onKeyDown={e=>{ if (e.key === 'Enter' && filteredVendors[0]) { const v=filteredVendors[0]; setVendorId(v.vendor_id); setVendorQuery(v.name); setShowVendorSuggest(false); } }}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: 6 }}
                  />
                  {showVendorSuggest && vendorQuery && filteredVendors.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: `1px solid ${roseGoldLight}`, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredVendors.map(v => (
                        <div
                          key={v.vendor_id}
                          onMouseDown={()=>{ setVendorId(v.vendor_id); setVendorQuery(v.name); setShowVendorSuggest(false); }}
                          style={{ padding: '8px 12px', cursor: 'pointer' }}
                          onMouseEnter={e=>{ e.currentTarget.style.background = '#f7f1f2'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background = '#fff'; }}
                        >
                          {v.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Product (search by name or ID)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="Search product"
                    value={productQuery}
                    onChange={e=>{ setProductQuery(e.target.value); setShowProductSuggest(true); }}
                    onFocus={()=>setShowProductSuggest(true)}
                    onBlur={()=>setTimeout(()=>setShowProductSuggest(false), 150)}
                    onKeyDown={e=>{ if (e.key === 'Enter' && filteredProducts[0]) { const p=filteredProducts[0]; setProductId(p.product_id); setSelectedSku(p.sku || null); setQtyUnit((p.sku || '') === 'Grams' ? 'Grams' : 'PCS'); setProductQuery(p.product_name); setShowProductSuggest(false); } }}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: 6 }}
                  />
                  {showProductSuggest && productQuery && filteredProducts.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: `1px solid ${roseGoldLight}`, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredProducts.map(p => (
                        <div
                          key={p.product_id}
                          onMouseDown={()=>{ setProductId(p.product_id); setSelectedSku(p.sku || null); setQtyUnit((p.sku || '') === 'Grams' ? 'Grams' : 'PCS'); setProductQuery(p.product_name); setShowProductSuggest(false); }}
                          style={{ padding: '8px 12px', cursor: 'pointer' }}
                          onMouseEnter={e=>{ e.currentTarget.style.background = '#f7f1f2'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.background = '#fff'; }}
                        >
                          {p.product_name} (ID: {p.product_id}){p.sku ? ` — ${p.sku}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Bill Price (total)</label>
                <input type="number" step="0.01" value={billPrice} onChange={e=>setBillPrice(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Quantity {selectedSku ? `(${selectedSku})` : ''}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" step="0.01" value={qty} onChange={e=>setQty(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                  <select
                    value={qtyUnit}
                    onChange={e=>setQtyUnit(e.target.value as any)}
                    style={{ width: 120, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
                    disabled={selectedSku !== 'Grams'}
                  >
                    {selectedSku === 'Grams' ? (
                      <>
                        <option value="Grams">Grams</option>
                        <option value="KG">KG</option>
                      </>
                    ) : (
                      <option value="PCS">PCS</option>
                    )}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Unit Price (auto)</label>
                <input value={unitPriceCalc === '' ? '' : String(unitPriceCalc)} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Selling Price (+30%, editable)</label>
                <input value={sellingPriceInput} onChange={e=>{ setSellingEdited(true); setSellingPriceInput(e.target.value); }} type="number" step="0.01" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Brand</label>
                <input value={brand} onChange={e=>setBrand(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="submit" style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
                onMouseLeave={e => (e.currentTarget.style.background = gold)}
              >
                Save Purchase
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: roseGold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showForm && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input placeholder="Invoice no" value={fInvoice} onChange={e=>setFInvoice(e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Vendor name" value={fVendor} onChange={e=>setFVendor(e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Vendor ID" value={fVendorId} onChange={e=>setFVendorId(e.target.value)} type="number" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Product name" value={fProduct} onChange={e=>setFProduct(e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Product ID" value={fProductId} onChange={e=>setFProductId(e.target.value)} type="number" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
              <input placeholder="Brand" value={fBrand} onChange={e=>setFBrand(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', boxSizing: 'border-box' }} />
            </div>

            {purchases.length === 0 ? (
              <p>No purchases yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {purchases
                  .filter(p => !fInvoice || (p.invoice_no || '').toLowerCase().includes(fInvoice.toLowerCase()))
                  .filter(p => !fVendor || (p.vendor_name || '').toLowerCase().includes(fVendor.toLowerCase()))
                  .filter(p => !fVendorId || p.vendor_id === Number(fVendorId))
                  .filter(p => !fDateFrom || new Date(p.date) >= new Date(fDateFrom))
                  .filter(p => !fDateTo || new Date(p.date) <= new Date(fDateTo))
                  .filter(p => !fProduct || p.items.some(it => products.find(pr => pr.product_id === it.product_id)?.product_name.toLowerCase().includes(fProduct.toLowerCase())))
                  .filter(p => !fProductId || p.items.some(it => it.product_id === Number(fProductId)))
                  .filter(p => !fBrand || p.items.some(it => (it.brand || '').toLowerCase().includes(fBrand.toLowerCase())))
                  .map(p => (
                    <div key={p.purchase_id} style={{ borderRadius: 8, padding: 12, background: 'linear-gradient(135deg, #f8e7a5, #fff)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: roseGold }}>Invoice: {p.invoice_no || '-'}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>Date: {new Date(p.date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Vendor: {p.vendor_name || '-'}</div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Total Bill: {p.bill_price?.toFixed?.(2) ?? p.bill_price}</div>
                      {p.items.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#777' }}>No items</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                          {p.items.map(it => (
                            <div key={it.purchase_item_id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: 12 }}>Product ID: {it.product_id}</div>
                                <div style={{ fontSize: 12 }}>Qty: {it.qty}</div>
                                <div style={{ fontSize: 12 }}>Unit Price: {it.unit_price}</div>
                                <div style={{ fontSize: 12 }}>Total: {it.total_price}</div>
                                <div style={{ fontSize: 12 }}>Brand: {it.brand || '-'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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