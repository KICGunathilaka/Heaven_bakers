import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { get, post } from '../services/api';

const roseGold = '#b76e79';
const roseGoldLight = '#e6c3c8';
const gold = '#d4af37';
const goldHover = '#c9a227';

export default function Sales() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [lcName, setLcName] = useState('');
  const [lcMobile, setLcMobile] = useState('');
  const [lcJoined, setLcJoined] = useState('');
  const [lcNic, setLcNic] = useState('');
  const [lcAddress, setLcAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [inventory, setInventory] = useState<Array<{ inventory_id: number; product_name: string | null; vendor_name: string | null; brand: string | null; sku: string | null; qty: number | string }>>([]);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Array<{ inventory_id: number | null; invQuery: string; showSuggest: boolean; sku: string | null; qtyUnit: 'Grams' | 'KG' | 'PCS'; qty: string; brand: string; unitPrice: number | null; sellingPrice: number | null; barcode: string | null }>>([
    { inventory_id: null, invQuery: '', showSuggest: false, sku: null, qtyUnit: 'PCS', qty: '', brand: '', unitPrice: null, sellingPrice: null, barcode: null }
  ]);
  const [sales, setSales] = useState<Array<{ sale_id: number; sale_invoice_no: string | null; date: string; total_amount: number | null; discount: number | null; note: string | null; customer_name: string | null; items: Array<{ sales_item_id: number; inventory_id: number; qty: number; brand: string | null; unit_price: number | null; selling_price: number | null; profit: number | null }> }>>([]);
  const [fInvoice, setFInvoice] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [fContact, setFContact] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [fProduct, setFProduct] = useState('');
  const [fInventoryId, setFInventoryId] = useState('');
  const [fBrand, setFBrand] = useState('');
  const [fTotalMin, setFTotalMin] = useState('');
  const [fTotalMax, setFTotalMax] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sales_form_cache');
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.invoiceNo === 'string') setInvoiceNo(d.invoiceNo);
        if (typeof d.customerName === 'string') setCustomerName(d.customerName);
        if (typeof d.contactNo === 'string') setContactNo(d.contactNo);
        if (typeof d.address === 'string') setAddress(d.address);
        if (typeof d.date === 'string') setDate(d.date);
        if (typeof d.discount === 'string') setDiscount(d.discount);
        if (typeof d.note === 'string') setNote(d.note);
        if (Array.isArray(d.items)) setItems(d.items);
        if (d.showForm === true) setShowForm(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const data = { invoiceNo, customerName, contactNo, address, date, discount, note, items, showForm };
    try { localStorage.setItem('sales_form_cache', JSON.stringify(data)); } catch {}
  }, [invoiceNo, customerName, contactNo, address, date, discount, note, items, showForm]);

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
      } catch (err: any) {
        if (err?.status === 401) navigate('/login', { replace: true });
      }
      try {
        const r = await get('/sales');
        const rows: any[] = r.sales || [];
        const map: Record<number, any> = {};
        for (const row of rows) {
          if (!map[row.sale_id]) {
            map[row.sale_id] = {
              sale_id: row.sale_id,
              sale_invoice_no: row.sale_invoice_no || null,
              date: row.date,
              total_amount: row.total_amount ?? null,
              discount: row.discount ?? null,
              note: row.note ?? null,
              customer_name: row.customer_name || null,
              contact_no: row.contact_no || null,
              items: []
            };
          }
          if (row.sales_item_id) {
            map[row.sale_id].items.push({
              sales_item_id: row.sales_item_id,
              inventory_id: row.inventory_id,
              qty: row.qty,
              brand: row.brand ?? null,
              unit_price: row.unit_price ?? null,
              selling_price: row.selling_price ?? null,
              profit: row.profit ?? null,
            });
          }
        }
        setSales(Object.values(map));
      } catch (err: any) {
        if (err?.status === 401) navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  function filteredFor(q: string) {
    const qq = q.toLowerCase();
    return inventory.filter(i =>
      (i.product_name || '').toLowerCase().includes(qq)
      || (i.brand || '').toLowerCase().includes(qq)
      || (i.vendor_name || '').toLowerCase().includes(qq)
      || (i.sku || '').toLowerCase().includes(qq)
      || String(i.inventory_id || '').includes(q)
    );
  }

  function roundUpToNearest5(n: number) {
    return Math.ceil(n / 5) * 5;
  }

  async function pickInventory(i: { inventory_id: number; product_name: string | null; brand: string | null; sku?: string | null }, row?: number) {
    if (typeof row === 'number') {
      const sku = i.sku ?? null;
      setItems(prev => prev.map((it, idx) => idx === row ? { ...it, inventory_id: i.inventory_id, invQuery: `${i.product_name || ''} ${i.brand ? `(${i.brand})` : ''}`.trim(), showSuggest: false, sku, qtyUnit: sku === 'Grams' ? 'Grams' : 'PCS' } : it));
      try {
        const r = await get(`/inventory/${i.inventory_id}/unit-price`);
        const u = r.unit_price ? Number(r.unit_price) : null;
        setItems(prev => prev.map((it, idx) => {
          if (idx !== row) return it;
          const isGrams = sku === 'Grams';
          const perUnitSell = u !== null ? (isGrams ? Number((u * 1.3).toFixed(2)) : roundUpToNearest5(u * 1.3)) : null;
          return { ...it, unitPrice: u, sellingPrice: perUnitSell };
        }));
      } catch {}
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validItems = items.filter(it => (it.inventory_id || it.barcode) && it.qty && Number(it.qty) > 0);
    if (validItems.length === 0) { setError('Add at least one product with qty'); return; }
    try {
      const payload = {
        sale_invoice_no: invoiceNo || undefined,
        customer_name: customerName || undefined,
        contact_no: contactNo || undefined,
        address: address || undefined,
        date: date || undefined,
        discount: discount ? Number(discount) : undefined,
        note: note || undefined,
        items: validItems.map(it => {
          const qtyNum = Number(it.qty || 0);
          const effectiveQty = (it.sku || '') === 'Grams' ? (it.qtyUnit === 'KG' ? qtyNum * 1000 : qtyNum) : qtyNum;
          if (it.barcode) {
            return { barcode: it.barcode, qty: effectiveQty };
          }
          return { inventory_id: it.inventory_id, qty: effectiveQty, brand: it.brand || undefined };
        })
      };
      await post('/sales', payload);
      try {
        const r = await get('/sales');
        const rows: any[] = r.sales || [];
        const map: Record<number, any> = {};
        for (const row of rows) {
          if (!map[row.sale_id]) {
            map[row.sale_id] = {
              sale_id: row.sale_id,
              sale_invoice_no: row.sale_invoice_no || null,
              date: row.date,
              total_amount: row.total_amount ?? null,
              discount: row.discount ?? null,
              note: row.note ?? null,
              customer_name: row.customer_name || null,
              contact_no: row.contact_no || null,
              items: []
            };
          }
          if (row.sales_item_id) {
            map[row.sale_id].items.push({
              sales_item_id: row.sales_item_id,
              inventory_id: row.inventory_id,
              qty: row.qty,
              brand: row.brand ?? null,
              unit_price: row.unit_price ?? null,
              selling_price: row.selling_price ?? null,
              profit: row.profit ?? null,
            });
          }
        }
        setSales(Object.values(map));
      } catch {}
      setInvoiceNo(''); setCustomerName(''); setContactNo(''); setAddress(''); setDate(''); setDiscount(''); setNote(''); setItems([{ inventory_id: null, invQuery: '', showSuggest: false, sku: null, qtyUnit: 'PCS', qty: '', brand: '', unitPrice: null, sellingPrice: null, barcode: null }]); setShowForm(false);
      try { localStorage.removeItem('sales_form_cache'); } catch {}
    } catch (err: any) {
      if (err?.status === 401) { localStorage.removeItem('token'); navigate('/login', { replace: true }); return; }
      setError(err?.message || 'Failed to save sale');
    }
  }

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
        <div style={{ fontWeight: 700, fontSize: 24 }}>Sales</div>
        
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
            onClick={() => setShowForm(v => !v)}
            style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
            onMouseLeave={e => (e.currentTarget.style.background = gold)}
          >
            {showForm ? 'Close' : 'Add Sale'}
          </button>
          <button
            onClick={() => setShowLoyalty(true)}
            style={{ marginLeft: 8, background: roseGold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
          >
            Add Loyalty Customer
          </button>
        </div>
        {showForm && (
          <form onSubmit={submit} style={{ borderRadius: 12, padding: 16, width: '100%', maxWidth: 1400, background: `linear-gradient(135deg, ${roseGoldLight}, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', boxSizing: 'border-box', marginBottom: 16 }}>
            {error && (<div style={{ color: 'red', marginBottom: 12 }}>{error}</div>)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Invoice No</label>
                <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Customer Name</label>
                <input value={customerName} onChange={e=>setCustomerName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Contact No</label>
                <input value={contactNo} onChange={e=>setContactNo(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2', marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Address</label>
                <input value={address} onChange={e=>setAddress(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: roseGold }}>Products</div>
                  <button type="button" onClick={() => setItems(prev => [...prev, { inventory_id: null, invQuery: '', showSuggest: false, sku: null, qtyUnit: 'PCS', qty: '', brand: '', unitPrice: null, sellingPrice: null, barcode: null }])} style={{ background: gold, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>Add Product</button>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6 }}>Inventory Item</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          placeholder="Search product, brand, SKU, or ID"
                          value={it.invQuery}
                          onChange={async e=>{ const v = e.target.value; setItems(prev => prev.map((x, i) => i === idx ? { ...x, invQuery: v, showSuggest: true } : x)); const vv = v.trim(); if (vv.toUpperCase().startsWith('BC-')) { try { const r = await get(`/barcode/${encodeURIComponent(vv)}/pricing`); if (r?.inventory_id) { await pickInventory({ inventory_id: r.inventory_id, product_name: r.product_name, brand: r.brand, sku: r.sku }, idx); } const unit = (r?.unit_price !== undefined && r?.unit_price !== null) ? Number(r.unit_price) : null; const sell = (r?.selling_price !== undefined && r?.selling_price !== null) ? Number(r.selling_price) : (unit !== null ? (r.sku === 'Grams' ? Number((unit * 1.3).toFixed(2)) : Math.ceil((unit * 1.3) / 5) * 5) : null); setItems(prev => prev.map((x, i) => i === idx ? { ...x, inventory_id: (r.inventory_id ?? x.inventory_id ?? null), invQuery: `${r.product_name || ''}${(r.brand || x.brand) ? ` (${r.brand || x.brand})` : ''}`.trim(), showSuggest: false, sku: r.sku || x.sku || null, qtyUnit: ((r.sku || x.sku) === 'Grams' ? 'Grams' : 'PCS'), brand: r.brand || x.brand || '', unitPrice: unit ?? x.unitPrice ?? null, sellingPrice: sell ?? x.sellingPrice ?? null, barcode: vv } : x)); } catch {} } }}
                          onPaste={async e=>{ e.preventDefault(); e.stopPropagation(); const text = (e.clipboardData?.getData('text') || '').trim(); if (text && text.toUpperCase().startsWith('BC-')) { try { const r = await get(`/barcode/${encodeURIComponent(text)}/pricing`); if (r?.inventory_id) { await pickInventory({ inventory_id: r.inventory_id, product_name: r.product_name, brand: r.brand, sku: r.sku }, idx); } const unit = (r?.unit_price !== undefined && r?.unit_price !== null) ? Number(r.unit_price) : null; const sell = (r?.selling_price !== undefined && r?.selling_price !== null) ? Number(r.selling_price) : (unit !== null ? (r.sku === 'Grams' ? Number((unit * 1.3).toFixed(2)) : Math.ceil((unit * 1.3) / 5) * 5) : null); setItems(prev => prev.map((x, i) => i === idx ? { ...x, inventory_id: (r.inventory_id ?? x.inventory_id ?? null), invQuery: `${r.product_name || ''}${(r.brand || x.brand) ? ` (${r.brand || x.brand})` : ''}`.trim(), showSuggest: false, sku: r.sku || x.sku || null, qtyUnit: ((r.sku || x.sku) === 'Grams' ? 'Grams' : 'PCS'), brand: r.brand || x.brand || '', unitPrice: unit ?? x.unitPrice ?? null, sellingPrice: sell ?? x.sellingPrice ?? null, barcode: text } : x)); } catch {} } }}
                          onFocus={()=>setItems(prev => prev.map((x, i) => i === idx ? { ...x, showSuggest: true } : x))}
                          onBlur={()=>setTimeout(()=>setItems(prev => prev.map((x, i) => i === idx ? { ...x, showSuggest: false } : x)), 150)}
                          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                        />
                        {it.showSuggest && it.invQuery && filteredFor(it.invQuery).length > 0 && (
                          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: `1px solid ${roseGoldLight}`, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                            {filteredFor(it.invQuery).map(i => (
                              <div key={i.inventory_id} onMouseDown={()=>pickInventory({ inventory_id: i.inventory_id, product_name: i.product_name, brand: i.brand, sku: i.sku }, idx)} style={{ padding: '8px 12px', cursor: 'pointer' }} onMouseEnter={e=>{ e.currentTarget.style.background = '#f7f1f2'; }} onMouseLeave={e=>{ e.currentTarget.style.background = '#fff'; }}>
                                {(i.product_name || 'Unknown')} {i.brand ? `(${i.brand})` : ''}{i.sku ? ` — ${i.sku}` : ''} {i.vendor_name ? ` — ${i.vendor_name}` : ''}  [ID: {i.inventory_id}]
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6 }}>Qty {it.sku ? `(${it.sku})` : ''}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="number" step="0.01" value={it.qty} onChange={e=>{ const v = e.target.value; setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: v } : x)); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                        <select
                          value={it.qtyUnit}
                          onChange={e=>{ const v = e.target.value as any; setItems(prev => prev.map((x, i) => i === idx ? { ...x, qtyUnit: v } : x)); }}
                          style={{ width: 120, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
                          disabled={it.sku !== 'Grams'}
                        >
                          {it.sku === 'Grams' ? (
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
                    <div>
                      <label style={{ display: 'block', marginBottom: 6 }}>Brand</label>
                      <input value={it.brand} onChange={e=>{ const v = e.target.value; setItems(prev => prev.map((x, i) => i === idx ? { ...x, brand: v } : x)); }} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6 }}>Unit Price</label>
                      <input value={it.unitPrice ?? ''} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6 }}>Selling Price</label>
                      <input value={it.sellingPrice ?? ''} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: roseGold, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Total Amount</label>
                  <input value={(() => {
                    const sum = items.reduce((acc, it) => {
                      const qtyNum = Number(it.qty || 0);
                      const effectiveQty = (it.sku || '') === 'Grams' ? (it.qtyUnit === 'KG' ? qtyNum * 1000 : qtyNum) : qtyNum;
                      if ((it.sku || '') === 'Grams') {
                        const perUnit = (it.unitPrice || 0) * 1.3;
                        const lineRounded = roundUpToNearest5(perUnit * effectiveQty);
                        return acc + lineRounded;
                      } else {
                        return acc + effectiveQty * (it.sellingPrice || 0);
                      }
                    }, 0);
                    const d = Number(discount || 0);
                    const net = sum * (1 - (isNaN(d) ? 0 : d / 100));
                    return net ? Number(net.toFixed(2)) : '';
                  })()} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Discount (%)</label>
                  <input type="number" step="0.01" min={0} max={100} value={discount} onChange={e=>setDiscount(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 4, marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Note</label>
                <input value={note} onChange={e=>setNote(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => (e.currentTarget.style.background = goldHover)} onMouseLeave={e => (e.currentTarget.style.background = gold)}>Save Sale</button>
            </div>
        </form>
        )}
        {showLoyalty && (
          <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ width: 420, maxWidth: '90%', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: `1px solid ${roseGoldLight}` }}>
              <div style={{ padding: 12, borderBottom: `1px solid ${roseGoldLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: roseGold }}>Add Loyalty Customer</div>
                <button onClick={() => setShowLoyalty(false)} style={{ background: 'transparent', color: '#333', border: 'none', padding: 6, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
                  <input value={lcName} onChange={e=>setLcName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Mobile No</label>
                  <input value={lcMobile} onChange={e=>setLcMobile(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Joined Date</label>
                  <input type="date" value={lcJoined} onChange={e=>setLcJoined(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>NIC</label>
                  <input value={lcNic} onChange={e=>setLcNic(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Address</label>
                  <input value={lcAddress} onChange={e=>setLcAddress(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={() => setShowLoyalty(false)} style={{ background: '#eee', color: '#333', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={async () => {
                      if (!lcName) { alert('Enter name'); return }
                      try {
                        const payload = { name: lcName, mobile_no: lcMobile || undefined, nic: lcNic || undefined, address: lcAddress || undefined, joined_date: lcJoined || undefined }
                        await post('/loyalty', payload)
                        setShowLoyalty(false); setLcName(''); setLcMobile(''); setLcJoined(''); setLcNic(''); setLcAddress('')
                      } catch (err: any) {
                        if (err?.status === 401) navigate('/login', { replace: true });
                        else alert(err?.message || 'Failed to save customer')
                      }
                    }}
                    style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = gold)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, display: showForm ? 'none' : 'block' }}>
          <div style={{ fontWeight: 700, color: roseGold, marginBottom: 8 }}>Recent Sales</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <input placeholder="Invoice" value={fInvoice} onChange={e=>setFInvoice(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Customer" value={fCustomer} onChange={e=>setFCustomer(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Contact" value={fContact} onChange={e=>setFContact(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Product" value={fProduct} onChange={e=>setFProduct(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Inventory ID" value={fInventoryId} onChange={e=>setFInventoryId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)', width: 120 }} />
            <input placeholder="Brand" value={fBrand} onChange={e=>setFBrand(e.target.value)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f7f7f7, #ffffff)' }} />
            <input placeholder="Min Total" type="number" step="0.01" value={fTotalMin} onChange={e=>setFTotalMin(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', width: 140 }} />
            <input placeholder="Max Total" type="number" step="0.01" value={fTotalMax} onChange={e=>setFTotalMax(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', width: 140 }} />
          </div>
          {(() => {
            const filtered = sales
              .filter(s => !fInvoice || (s.sale_invoice_no || '').toLowerCase().includes(fInvoice.toLowerCase()))
              .filter(s => !fCustomer || (s.customer_name || '').toLowerCase().includes(fCustomer.toLowerCase()))
              .filter(s => !fContact || (s as any).contact_no && String((s as any).contact_no).toLowerCase().includes(fContact.toLowerCase()))
              .filter(s => !fDateFrom || new Date(s.date) >= new Date(fDateFrom))
              .filter(s => !fDateTo || new Date(s.date) <= new Date(fDateTo))
              .filter(s => !fTotalMin || (s.total_amount ?? 0) >= Number(fTotalMin))
              .filter(s => !fTotalMax || (s.total_amount ?? 0) <= Number(fTotalMax))
              .filter(s => !fBrand || s.items.some(it => (it.brand || '').toLowerCase().includes(fBrand.toLowerCase())))
              .filter(s => !fInventoryId || s.items.some(it => String(it.inventory_id).includes(fInventoryId.trim())))
              .filter(s => !fProduct || s.items.some(it => (inventory.find(inv => inv.inventory_id === it.inventory_id)?.product_name || '').toLowerCase().includes(fProduct.toLowerCase())));
            if (filtered.length === 0) return (<div style={{ fontSize: 12, color: '#777' }}>No sales</div>);
            return filtered.slice(0, 20).map(s => (
              <div key={s.sale_id} style={{ borderRadius: 8, padding: 12, background: `linear-gradient(135deg, ${roseGoldLight}, #fff)`, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>Invoice: {s.sale_invoice_no || '-'}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{new Date(s.date).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Customer: {s.customer_name || '-'}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Total: {s.total_amount?.toFixed?.(2) ?? s.total_amount}</div>
                {s.items.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#777' }}>No items</div>
                ) : (
                  <div style={{ fontSize: 12, color: '#555' }}>Items: {s.items.length}</div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}