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
  function goHome() {
    navigate('/dashboard');
  }
  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [expensesRows, setExpensesRows] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

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
          background: `linear-gradient(90deg, ${roseGold}, ${roseGoldLight})`,
          color: white,
          borderBottom: `1px solid ${roseGoldLight}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <button
          onClick={goProducts}
          style={{
            background: gold,
            color: white,
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
          Products
        </button>
        <button
          onClick={goVendors}
          style={{
            background: gold,
            color: white,
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
          Vendors
        </button>
        <button
          onClick={goPurchase}
          style={{
            background: gold,
            color: white,
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
          Purchase
        </button>
        <button
          onClick={goInventory}
          style={{
            background: gold,
            color: white,
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
          Inventory
        </button>
        <button
          onClick={goSales}
          style={{
            background: gold,
            color: white,
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
          Sales
        </button>
        <button
          onClick={goExpenses}
          style={{
            background: gold,
            color: white,
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
          Expenses
        </button>
        <button
          onClick={goReports}
          style={{
            background: gold,
            color: white,
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
          Reports
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={goHome}
          style={{
            background: gold,
            color: white,
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
            color: white,
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
      <div style={{ padding: 24 }}>
        <h2 style={{ color: roseGold }}>Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, ${roseGoldLight}, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Today Sales</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todaySales)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #f8e7a5, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: gold, fontWeight: 700, opacity: 0.9 }}>Today Expenses</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todayExpenses)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #d9a1aa, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Profit</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(todayProfit)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #f7f7f7, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
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
                  const colors = ['#b76e79','#d4af37','#c9a227','#7fb069','#6fa3ef','#f28c8c','#a48cf2'];
                  function arcPath(cx:number, cy:number, r:number, start:number, end:number) {
                    const s = (start-90) * Math.PI/180; const e = (end-90) * Math.PI/180;
                    const x1 = cx + r*Math.cos(s); const y1 = cy + r*Math.sin(s);
                    const x2 = cx + r*Math.cos(e); const y2 = cy + r*Math.sin(e);
                    const large = (end-start) > 180 ? 1 : 0;
                    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  }
                  return purchasesByVendor.map((seg, idx) => {
                    const start = acc*360; const end = (acc+seg.pct)*360; acc += seg.pct;
                    return <path key={seg.label} d={arcPath(CX,CY,R,start,end)} fill={colors[idx%colors.length]} opacity={0.9} />
                  });
                })()}
              </svg>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {purchasesByVendor.slice(0,8).map((seg, i) => (
                  <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: ['#b76e79','#d4af37','#c9a227','#7fb069','#6fa3ef','#f28c8c','#a48cf2'][i%7] }} />
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
                  const colors = ['#6fa3ef','#f28c8c','#a48cf2','#7fb069','#b76e79','#d4af37','#c9a227'];
                  function arcPath(cx:number, cy:number, r:number, start:number, end:number) {
                    const s = (start-90) * Math.PI/180; const e = (end-90) * Math.PI/180;
                    const x1 = cx + r*Math.cos(s); const y1 = cy + r*Math.sin(s);
                    const x2 = cx + r*Math.cos(e); const y2 = cy + r*Math.sin(e);
                    const large = (end-start) > 180 ? 1 : 0;
                    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  }
                  return purchasesByProduct.map((seg, idx) => {
                    const start = acc*360; const end = (acc+seg.pct)*360; acc += seg.pct;
                    return <path key={seg.label} d={arcPath(CX,CY,R,start,end)} fill={colors[idx%colors.length]} opacity={0.9} />
                  });
                })()}
              </svg>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {purchasesByProduct.slice(0,8).map((seg, i) => (
                  <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: ['#6fa3ef','#f28c8c','#a48cf2','#7fb069','#b76e79','#d4af37','#c9a227'][i%7] }} />
                      <div style={{ fontWeight: 700 }}>{seg.label}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>Rs. {fmt(seg.value)} ({Math.round(seg.pct*100)}%)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #fff2cc, #ffffff)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
          <div style={{ color: roseGold, fontWeight: 700, marginBottom: 8 }}>Sales (Last 7 Days)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 160 }}>
            {salesLast7.map((d, i) => {
              const h = Math.round((d.total / maxBar) * 140) + 6;
              const bg = `linear-gradient(180deg, ${roseGoldLight}, #f7f7f7)`;
              return (
                <div key={d.date} style={{ width: 36, background: bg, height: h, borderRadius: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 10, marginBottom: 4 }}>Rs. {fmt(d.total)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 6 }}>
            {salesLast7.map(d => (
              <div key={d.date} style={{ width: 36, textAlign: 'center', fontSize: 10 }}>{d.date.slice(5)}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}