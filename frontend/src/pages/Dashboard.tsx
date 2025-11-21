import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { get } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const roseGold = '#b76e79';
  const roseGoldLight = '#d9a1aa';
  const gold = '#d4af37';
  const goldHover = '#c9a227';
  const white = '#ffffff';
  const standardColors = ['#3366CC','#DC3912','#FF9900','#109618','#990099','#3B3EAC','#0099C6'];
  function adjust(hex: string, amt: number) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00FF) + amt;
    let b = (num & 0x0000FF) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    const out = (r << 16) | (g << 8) | b;
    return '#' + out.toString(16).padStart(6, '0');
  }
  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }
  function goProducts() {
    navigate('/products');
  }
  function goVendors() {
    navigate('/vendors');
  }
  function goPurchase() {
    navigate('/purchase');
  }
  function goInventory() {
    navigate('/inventory');
  }
  function goSales() {
    navigate('/sales');
  }
  function goExpenses() {
    navigate('/expenses');
  }
  function goReports() {
    navigate('/reports');
  }
  function goLoyalty() {
    navigate('/loyalty');
  }
  function goHome() {
    navigate('/dashboard');
  }
  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [expensesRows, setExpensesRows] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshData() {
    setRefreshing(true);
    try { const r = await get('/sales'); setSalesRows(r.sales || []); } catch { setSalesRows([]); }
    try { const r = await get('/expenses'); setExpensesRows(r.expenses || []); } catch { setExpensesRows([]); }
    try { const r = await get('/purchases'); setPurchases(r.purchases || []); } catch { setPurchases([]); }
    try { const r = await get('/inventory'); setInventory(r.inventory || []); } catch { setInventory([]); }
    try { const r = await get('/products'); setProducts(r.products || []); } catch { setProducts([]); }
    setRefreshing(false);
  }

  useEffect(() => {
    (async () => {
      try { const r = await get('/sales'); setSalesRows(r.sales || []); } catch {}
      try { const r = await get('/expenses'); setExpensesRows(r.expenses || []); } catch {}
      try { const r = await get('/purchases'); setPurchases(r.purchases || []); } catch {}
      try { const r = await get('/inventory'); setInventory(r.inventory || []); } catch {}
      try { const r = await get('/products'); setProducts(r.products || []); } catch {}
    })();
  }, []);

  function fmt(n: number) { return new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
  function localDateKey(d: Date) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
  const todayKey = localDateKey(new Date());
  const salesById = useMemo(() => {
    const map: Record<number, any> = {};
    for (const row of salesRows) {
      if (!map[row.sale_id]) {
        map[row.sale_id] = { sale_id: row.sale_id, date: row.date, total_amount: row.total_amount ?? 0, items: [] };
      }
      if (row.sales_item_id) {
        map[row.sale_id].items.push({ sales_item_id: row.sales_item_id, qty: Number(row.qty || 0), profit: Number(row.profit || 0), inventory_id: row.inventory_id });
      }
    }
    return Object.values(map);
  }, [salesRows]);

  const todaySales = useMemo(() => {
    let sum = 0;
    for (const s of salesById) {
      if (String(s.date).slice(0,10) === todayKey) sum += Number(s.total_amount || 0);
    }
    return Number(sum.toFixed(2));
  }, [salesById, todayKey]);

  const todayProfit = useMemo(() => {
    let sum = 0;
    for (const s of salesById) {
      if (String(s.date).slice(0,10) === todayKey) {
        for (const it of s.items) sum += Number(it.profit || 0);
      }
    }
    return Number(sum.toFixed(2));
  }, [salesById, todayKey]);

  const todayExpenses = useMemo(() => {
    let sum = 0;
    for (const e of expensesRows) {
      const k = e.created_at ? localDateKey(new Date(e.created_at)) : '';
      if (k === todayKey) sum += Number(e.amount || 0);
    }
    return Number(sum.toFixed(2));
  }, [expensesRows, todayKey]);

  const invNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const i of inventory) map[i.inventory_id] = `${i.product_name || 'Unknown'}${i.brand ? ` (${i.brand})` : ''}`;
    return map;
  }, [inventory]);

  const mostMoving = useMemo(() => {
    const qtyMap: Record<string, number> = {};
    for (const s of salesById) {
      for (const it of s.items) {
        const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
        qtyMap[name] = (qtyMap[name] || 0) + Number(it.qty || 0);
      }
    }
    const arr = Object.entries(qtyMap).map(([name, qty]) => ({ name, qty }));
    arr.sort((a,b) => b.qty - a.qty);
    return arr.slice(0,5);
  }, [salesById, invNameMap]);

  const purchasesByVendor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of purchases) {
      const vendor = p.vendor_name || 'Unknown';
      const items: any[] = p.items || [];
      const sum = items.reduce((acc, it) => acc + Number(it.total_price || 0), 0);
      map[vendor] = (map[vendor] || 0) + sum;
    }
    const total = Object.values(map).reduce((a,b)=>a+b,0) || 1;
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: value / total }));
  }, [purchases]);

  const prodName = useMemo(() => {
    const map: Record<number, string> = {};
    for (const p of products) map[p.product_id] = p.product_name;
    return map;
  }, [products]);

  const purchasesByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of purchases) {
      const items: any[] = p.items || [];
      for (const it of items) {
        const name = prodName[it.product_id] || `Product ${it.product_id}`;
        map[name] = (map[name] || 0) + Number(it.total_price || 0);
      }
    }
    const total = Object.values(map).reduce((a,b)=>a+b,0) || 1;
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: value / total })).slice(0,8);
  }, [purchases, prodName]);

  const salesLast7 = useMemo(() => {
    const days: { date: string, total: number }[] = [];
    for (let i=6;i>=0;i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      let sum = 0;
      for (const s of salesById) if (String(s.date).slice(0,10) === key) sum += Number(s.total_amount || 0);
      days.push({ date: key, total: Number(sum.toFixed(2)) });
    }
    return days;
  }, [salesById]);

  const maxBar = Math.max(...salesLast7.map(d=>d.total), 1);

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
          background: 'linear-gradient(90deg, #212121, #ffffff)',
          color: white,
          borderBottom: '1px solid #dcdcdc',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
        }}
      >
        <button
          onClick={goProducts}
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
          Products
        </button>
        <button
          onClick={goVendors}
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
          Vendors
        </button>
        <button
          onClick={goPurchase}
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
          Purchase
        </button>
        <button
          onClick={goInventory}
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
          Inventory
        </button>
        <button
          onClick={goSales}
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
          Sales
        </button>
        <button
          onClick={goExpenses}
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
          Expenses
        </button>
        <button
          onClick={goReports}
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
          Reports
        </button>
        
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
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
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
          onMouseEnter={e => (e.currentTarget.style.background = goldHover)}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}
        >
          Logout
        </button>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: roseGold, fontSize: 32, fontWeight: 800 }}>Dashboard</h2>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              background: gold,
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = goldHover; e.currentTarget.style.color = '#000'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.color = '#000'; }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #bbdefb, #64b5f6)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Today Sales</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todaySales)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #ffcdd2, #ef9a9a)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: gold, fontWeight: 700, opacity: 0.9 }}>Today Expenses</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todayExpenses)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #c8e6c9, #81c784)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Profit</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todayProfit)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #fff9c4, #ffe082)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Most Moving</div>
            {mostMoving.length === 0 ? (
              <div style={{ color: '#777' }}>No data</div>
            ) : (
              mostMoving.map(m => (
                <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontWeight: 700 }}>{m.qty}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #ffe3ea, #ffffff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, marginBottom: 6 }}>Purchases by Vendor</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
              {purchasesByVendor.slice(0,6).map((seg, i) => (
                <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: `linear-gradient(135deg, ${adjust(standardColors[i%standardColors.length], 80)}, ${adjust(standardColors[i%standardColors.length], 20)})` }} />
                    <div style={{ fontWeight: 700, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seg.label}</div>
                  </div>
                  <div style={{ fontWeight: 800 }}>Rs. {fmt(seg.value)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #e6f0ff, #ffffff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, marginBottom: 6 }}>Purchases by Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
              {purchasesByProduct.slice(0,6).map((seg, i) => (
                <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: `linear-gradient(135deg, ${adjust(standardColors[i%standardColors.length], 80)}, ${adjust(standardColors[i%standardColors.length], 20)})` }} />
                    <div style={{ fontWeight: 700, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seg.label}</div>
                  </div>
                  <div style={{ fontWeight: 800 }}>Rs. {fmt(seg.value)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #a5d6a7, #66bb6a)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, marginBottom: 6 }}>Sales (Last 7 Days)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
              {salesLast7.map(d => {
                const h = Math.round((d.total / maxBar) * 90) + 6;
                const bg = `linear-gradient(180deg, #616161, #212121)`;
                return (
                  <div key={d.date} style={{ width: 24, background: bg, height: h, borderRadius: 6, boxShadow: '0 3px 8px rgba(0,0,0,0.12)' }} />
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #ffe3ea, #ffffff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, marginBottom: 8 }}>Purchases by Vendor</div>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'center' }}>
              <svg width={280} height={240} viewBox="0 0 280 240">
                <rect x={0} y={0} width={280} height={240} fill="#ffe3ea" rx={12} />
                {(() => {
                  const CX = 140, CY = 120, R = 100;
                  let acc = 0;
                  function arcPath(cx:number, cy:number, r:number, start:number, end:number) {
                    const s = (start-90) * Math.PI/180; const e = (end-90) * Math.PI/180;
                    const x1 = cx + r*Math.cos(s); const y1 = cy + r*Math.sin(s);
                    const x2 = cx + r*Math.cos(e); const y2 = cy + r*Math.sin(e);
                    const large = (end-start) > 180 ? 1 : 0;
                    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  }
                  const grads = purchasesByVendor.map((seg, idx) => {
                    const base = standardColors[idx%standardColors.length];
                    const light = adjust(base, 80);
                    const dark = adjust(base, 20);
                    return { id: `vendorGrad-${idx}`, light, dark };
                  });
                  const elems = [] as JSX.Element[];
                  elems.push(
                    <defs key="defs-vendor">
                      {grads.map(g => (
                        <linearGradient id={g.id} x1="0" y1="0" x2="1" y2="1" key={g.id}>
                          <stop offset="0%" stopColor={g.light} />
                          <stop offset="100%" stopColor={g.dark} />
                        </linearGradient>
                      ))}
                    </defs>
                  );
                  purchasesByVendor.forEach((seg, idx) => {
                    const start = acc*360; const end = (acc+seg.pct)*360; acc += seg.pct;
                    elems.push(<path key={seg.label} d={arcPath(CX,CY,R,start,end)} fill={`url(#${grads[idx].id})`} opacity={0.85} />);
                  });
                  return elems;
                })()}
              </svg>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {purchasesByVendor.slice(0,8).map((seg, i) => (
                  <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: `linear-gradient(135deg, ${adjust(standardColors[i%standardColors.length], 80)}, ${adjust(standardColors[i%standardColors.length], 20)})` }} />
                      <div style={{ fontWeight: 700 }}>{seg.label}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>Rs. {fmt(seg.value)} ({Math.round(seg.pct*100)}%)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #e6f0ff, #ffffff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, marginBottom: 8 }}>Purchases by Product</div>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'center' }}>
              <svg width={280} height={240} viewBox="0 0 280 240">
                <rect x={0} y={0} width={280} height={240} fill="#e6f0ff" rx={12} />
                {(() => {
                  const CX = 140, CY = 120, R = 100;
                  let acc = 0;
                  function arcPath(cx:number, cy:number, r:number, start:number, end:number) {
                    const s = (start-90) * Math.PI/180; const e = (end-90) * Math.PI/180;
                    const x1 = cx + r*Math.cos(s); const y1 = cy + r*Math.sin(s);
                    const x2 = cx + r*Math.cos(e); const y2 = cy + r*Math.sin(e);
                    const large = (end-start) > 180 ? 1 : 0;
                    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  }
                  const grads = purchasesByProduct.map((seg, idx) => {
                    const base = standardColors[idx%standardColors.length];
                    const light = adjust(base, 80);
                    const dark = adjust(base, 20);
                    return { id: `productGrad-${idx}`, light, dark };
                  });
                  const elems = [] as JSX.Element[];
                  elems.push(
                    <defs key="defs-product">
                      {grads.map(g => (
                        <linearGradient id={g.id} x1="0" y1="0" x2="1" y2="1" key={g.id}>
                          <stop offset="0%" stopColor={g.light} />
                          <stop offset="100%" stopColor={g.dark} />
                        </linearGradient>
                      ))}
                    </defs>
                  );
                  purchasesByProduct.forEach((seg, idx) => {
                    const start = acc*360; const end = (acc+seg.pct)*360; acc += seg.pct;
                    elems.push(<path key={seg.label} d={arcPath(CX,CY,R,start,end)} fill={`url(#${grads[idx].id})`} opacity={0.85} />);
                  });
                  return elems;
                })()}
              </svg>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {purchasesByProduct.slice(0,8).map((seg, i) => (
                  <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: `linear-gradient(135deg, ${adjust(standardColors[i%standardColors.length], 80)}, ${adjust(standardColors[i%standardColors.length], 20)})` }} />
                      <div style={{ fontWeight: 700 }}>{seg.label}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>Rs. {fmt(seg.value)} ({Math.round(seg.pct*100)}%)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #a5d6a7, #66bb6a)', boxShadow: '0 6px 18px rgba(0,0,0,0.1)' }}>
          <div style={{ color: roseGold, fontWeight: 700, marginBottom: 8 }}>Sales (Last 7 Days)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 160 }}>
              {salesLast7.map((d, i) => {
                const h = Math.round((d.total / maxBar) * 140) + 6;
                const bg = `linear-gradient(180deg, #616161, #212121)`;
                return (
                  <div key={d.date} style={{ width: 36, background: bg, height: h, borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }} />
                );
              })}
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {salesLast7.map(d => (
                <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12 }}>{d.date.slice(5)}</div>
                  <div style={{ fontWeight: 800, fontSize: 12, padding: '4px 8px', borderRadius: 8, background: 'linear-gradient(135deg, #616161, #212121)', color: '#fff' }}>Rs. {fmt(d.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}