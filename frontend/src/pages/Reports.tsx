import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const roseGold = '#b76e79';
const roseGoldLight = '#d9a1aa';
const gold = '#d4af37';
const goldHover = '#c9a227';

export default function Reports() {
  const navigate = useNavigate();
  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [expensesRows, setExpensesRows] = useState<any[]>([]);
  const [purchasesRows, setPurchasesRows] = useState<any[]>([]);
  const [inventoryRows, setInventoryRows] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<'Summary'|'Sales'|'Inventory'|'Purchases'>('Summary');

  function logout() { localStorage.removeItem('token'); navigate('/login', { replace: true }); }
  function goHome() { navigate('/dashboard'); }

  useEffect(() => {
    (async () => {
      try { const r = await get('/sales'); setSalesRows(r.sales || []); } catch (e: any) { if (e?.status === 401) navigate('/login', { replace: true }); }
      try { const r = await get('/expenses'); setExpensesRows(r.expenses || []); } catch (e: any) { if (e?.status === 401) navigate('/login', { replace: true }); }
      try { const r = await get('/purchases'); setPurchasesRows(r.purchases || []); } catch (e: any) { if (e?.status === 401) navigate('/login', { replace: true }); }
      try { const r = await get('/inventory'); setInventoryRows(r.inventory || []); } catch (e: any) { if (e?.status === 401) navigate('/login', { replace: true }); }
    })();
  }, [navigate]);

  function inRange(d: Date) {
    const dv = d.valueOf();
    const f = from ? new Date(from).valueOf() : undefined;
    const t = to ? new Date(to).valueOf() : undefined;
    if (f !== undefined && dv < f) return false;
    if (t !== undefined && dv > t) return false;
    return true;
  }

  const salesTotal = useMemo(() => {
    const map: Record<number, any> = {};
    for (const row of salesRows) {
      if (!map[row.sale_id]) {
        map[row.sale_id] = { sale_id: row.sale_id, date: row.date, total_amount: row.total_amount ?? 0, items: [] };
      }
      if (row.sales_item_id) {
        map[row.sale_id].items.push({ sales_item_id: row.sales_item_id, qty: Number(row.qty || 0), profit: Number(row.profit || 0), inventory_id: row.inventory_id });
      }
    }
    let sum = 0;
    for (const s of Object.values(map)) {
      const d = new Date((s as any).date);
      if (inRange(d)) sum += Number((s as any).total_amount || 0);
    }
    return Number(sum.toFixed(2));
  }, [salesRows, from, to]);

  const expensesTotal = useMemo(() => {
    let sum = 0;
    for (const e of expensesRows) {
      const d = e.created_at ? new Date(e.created_at) : new Date();
      if (inRange(d)) sum += Number(e.amount || 0);
    }
    return Number(sum.toFixed(2));
  }, [expensesRows, from, to]);

  const purchasesTotal = useMemo(() => {
    let sum = 0;
    for (const p of purchasesRows) {
      const d = new Date(p.date);
      if (inRange(d)) {
        const items: any[] = p.items || [];
        const s = items.reduce((acc, it) => acc + Number(it.total_price || 0), 0);
        sum += s;
      }
    }
    return Number(sum.toFixed(2));
  }, [purchasesRows, from, to]);

  const profitTotal = useMemo(() => {
    const map: Record<number, any> = {};
    for (const row of salesRows) {
      if (!map[row.sale_id]) {
        map[row.sale_id] = { sale_id: row.sale_id, date: row.date, total_amount: row.total_amount ?? 0, items: [] };
      }
      if (row.sales_item_id) {
        map[row.sale_id].items.push({ sales_item_id: row.sales_item_id, qty: Number(row.qty || 0), profit: Number(row.profit || 0), inventory_id: row.inventory_id });
      }
    }
    let sum = 0;
    for (const s of Object.values(map)) {
      const d = new Date((s as any).date);
      if (inRange(d)) {
        for (const it of (s as any).items) sum += Number(it.profit || 0);
      }
    }
    return Number(sum.toFixed(2));
  }, [salesRows, from, to]);

  function fmt(n: number) { return new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }

  const salesById = useMemo(() => {
    const map: Record<number, any> = {};
    for (const row of salesRows) {
      if (!map[row.sale_id]) {
        map[row.sale_id] = {
          sale_id: row.sale_id,
          sale_invoice_no: row.sale_invoice_no,
          date: row.date,
          total_amount: row.total_amount ?? 0,
          discount: row.discount ?? null,
          customer_name: row.customer_name ?? null,
          items: []
        };
      }
      if (row.sales_item_id) {
        map[row.sale_id].items.push({ sales_item_id: row.sales_item_id, qty: Number(row.qty || 0), profit: Number(row.profit || 0), inventory_id: row.inventory_id, selling_price: Number(row.selling_price || 0) });
      }
    }
    return Object.values(map);
  }, [salesRows]);

  function currentRows(): any[] {
    if (report === 'Summary') {
      return [
        { label: 'Sales Total', value: salesTotal },
        { label: 'Purchases Total', value: purchasesTotal },
        { label: 'Expenses Total', value: expensesTotal },
        { label: 'Profit Total', value: profitTotal }
      ];
    }
    if (report === 'Sales') {
      return salesById
        .filter(s => inRange(new Date(s.date)))
        .map(s => ({ date: new Date(s.date).toLocaleDateString(), invoice: s.sale_invoice_no || '-', total: Number(s.total_amount || 0), items: (s.items || []).length, profit: (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0) }));
    }
    if (report === 'Purchases') {
      return purchasesRows
        .filter(p => inRange(new Date(p.date)))
        .map(p => ({ date: new Date(p.date).toLocaleDateString(), invoice: p.invoice_no || '-', vendor: p.vendor_name || '-', total: Number(p.bill_price || 0) }));
    }
    return inventoryRows.map(i => ({ product: i.product_name || '-', brand: i.brand || '-', vendor: i.vendor_name || '-', qty: Number(i.qty || 0) }));
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    if (report === 'Sales') {
      const filtered = salesById.filter(s => inRange(new Date(s.date)));
      const invoices = filtered.map(s => ({ date: new Date(s.date).toLocaleDateString(), invoice: s.sale_invoice_no || '-', total: Number(s.total_amount || 0), items: (s.items || []).length, profit: (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0) }));
      const dayMap: Record<string, { total: number; profit: number; invoices: number }> = {};
      for (const s of filtered) {
        const key = new Date(s.date).toISOString().slice(0,10);
        const prof = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
        if (!dayMap[key]) dayMap[key] = { total: 0, profit: 0, invoices: 0 };
        dayMap[key].total += Number(s.total_amount || 0);
        dayMap[key].profit += prof;
        dayMap[key].invoices += 1;
      }
      const byDay = Object.entries(dayMap).map(([date, v]) => ({ date, total: Number(v.total.toFixed(2)), profit: Number(v.profit.toFixed(2)), invoices: v.invoices }))
        .sort((a,b) => a.date.localeCompare(b.date));
      const invNameMap: Record<number, string> = {};
      for (const i of inventoryRows) invNameMap[i.inventory_id] = `${i.product_name || 'Unknown'}${i.brand ? ` (${i.brand})` : ''}`;
      const prodMap: Record<string, { qty: number; revenue: number; profit: number }> = {};
      for (const s of filtered) {
        for (const it of (s.items || [])) {
          const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
          const q = Number(it.qty || 0);
          const rev = Number(it.selling_price || 0) * q;
          const pr = Number(it.profit || 0);
          const cur = prodMap[name] || { qty: 0, revenue: 0, profit: 0 };
          prodMap[name] = { qty: cur.qty + q, revenue: Number((cur.revenue + rev).toFixed(2)), profit: Number((cur.profit + pr).toFixed(2)) };
        }
      }
      const byProduct = Object.entries(prodMap).map(([product, v]) => ({ product, qty: v.qty, revenue: v.revenue, profit: v.profit }))
        .sort((a,b) => b.revenue - a.revenue);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ metric: 'Sales Total', value: salesTotal }, { metric: 'Profit Total', value: profitTotal }]), 'Sales_Summary');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDay), 'By_Day');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byProduct), 'By_Product');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices), 'Invoices');
    } else {
      const rows = currentRows();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), report);
    }
    const name = `Heaven_${report}_${from || 'all'}_${to || 'all'}.xlsx`;
    XLSX.writeFile(wb, name);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Heaven Bakers`, 14, 16);
    doc.setFontSize(14);
    doc.text(`${report} Report`, 14, 24);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 28, 200, 28);
    let y = 34;
    if (report === 'Sales') {
      const filtered = salesById.filter(s => inRange(new Date(s.date)));
      const height = (doc as any).internal.pageSize.getHeight();
      const width = (doc as any).internal.pageSize.getWidth();
      const margin = 14;
      function addLine(text: string, size = 11, bold = false) {
        if (y > height - 20) { doc.addPage(); y = margin; }
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(text, margin, y);
        y += 6;
      }
      const totalSales = filtered.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
      const totalProfit = filtered.reduce((acc, s) => acc + (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0), 0);
      const invoiceCount = filtered.length;
      const avgInvoice = invoiceCount ? Number((totalSales / invoiceCount).toFixed(2)) : 0;
      addLine(`Date Range: ${from && to ? `${new Date(from).toLocaleDateString()} - ${new Date(to).toLocaleDateString()}` : 'All Dates'}`, 12, true);
      addLine(`Sales Total: Rs. ${fmt(totalSales)}`, 12);
      addLine(`Profit Total: Rs. ${fmt(totalProfit)}`, 12);
      addLine(`Invoices: ${invoiceCount}`, 12);
      addLine(`Average per Invoice: Rs. ${fmt(avgInvoice)}`, 12);
      addLine(`Generated: ${new Date().toLocaleString()}`, 11);
      y += 4;
      addLine('By Day', 12, true);
      const dayMap: Record<string, { total: number; profit: number; invoices: number }> = {};
      for (const s of filtered) {
        const key = new Date(s.date).toISOString().slice(0,10);
        const prof = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
        if (!dayMap[key]) dayMap[key] = { total: 0, profit: 0, invoices: 0 };
        dayMap[key].total += Number(s.total_amount || 0);
        dayMap[key].profit += prof;
        dayMap[key].invoices += 1;
      }
      const byDay = Object.entries(dayMap).map(([date, v]) => ({ date, total: Number(v.total.toFixed(2)), profit: Number(v.profit.toFixed(2)), invoices: v.invoices }))
        .sort((a,b) => a.date.localeCompare(b.date));
      for (const d of byDay) {
        addLine(`${new Date(d.date).toLocaleDateString()} — Invoices: ${d.invoices}, Total: Rs. ${fmt(d.total)}, Profit: Rs. ${fmt(d.profit)}`);
      }
      y += 4;
      addLine('By Product', 12, true);
      const invNameMap: Record<number, string> = {};
      for (const i of inventoryRows) invNameMap[i.inventory_id] = `${i.product_name || 'Unknown'}${i.brand ? ` (${i.brand})` : ''}`;
      const prodMap: Record<string, { qty: number; revenue: number; profit: number }> = {};
      for (const s of filtered) {
        for (const it of (s.items || [])) {
          const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
          const q = Number(it.qty || 0);
          const rev = Number(it.selling_price || 0) * q;
          const pr = Number(it.profit || 0);
          const cur = prodMap[name] || { qty: 0, revenue: 0, profit: 0 };
          prodMap[name] = { qty: cur.qty + q, revenue: Number((cur.revenue + rev).toFixed(2)), profit: Number((cur.profit + pr).toFixed(2)) };
        }
      }
      const byProduct = Object.entries(prodMap).map(([product, v]) => ({ product, qty: v.qty, revenue: v.revenue, profit: v.profit }))
        .sort((a,b) => b.revenue - a.revenue);
      for (const p of byProduct) {
        addLine(`${p.product} — Qty: ${p.qty}, Revenue: Rs. ${fmt(p.revenue)}, Profit: Rs. ${fmt(p.profit)}`);
      }
      y += 4;
      addLine('Invoices', 12, true);
      for (const s of filtered) {
        const invDate = new Date(s.date).toLocaleDateString();
        const invTotal = Number(s.total_amount || 0);
        const invProfit = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
        const cust = s.customer_name ? String(s.customer_name) : '-';
        const disc = s.discount != null ? `${Number(s.discount)}%` : '-';
        addLine(`Invoice: ${s.sale_invoice_no || '-'} — ${invDate}`, 12, true);
        addLine(`Customer: ${cust} | Discount: ${disc}`);
        addLine(`Total: Rs. ${fmt(invTotal)} | Items: ${(s.items || []).length} | Profit: Rs. ${fmt(invProfit)}`);
        for (const it of (s.items || [])) {
          const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
          const qty = Number(it.qty || 0);
          const sp = Number(it.selling_price || 0);
          const rev = Number((sp * qty).toFixed(2));
          const pr = Number(it.profit || 0);
          addLine(`- ${name}: ${qty} x Rs. ${fmt(sp)} = Rs. ${fmt(rev)} | Profit: Rs. ${fmt(pr)}`);
        }
        y += 2;
      }
    } else {
      const rows = currentRows();
      const head = report === 'Summary' ? [['Metric', 'Value']] : [Object.keys(rows[0] || {})];
      const body = report === 'Summary' ? rows.map(r => [r.label, String(r.value)]) : rows.map(r => Object.values(r).map(v => typeof v === 'number' ? v.toFixed(2) : String(v)));
      // @ts-ignore
      doc.autoTable({ head, body, startY: y });
    }
    const name = `Heaven_${report}_${from || 'all'}_${to || 'all'}.pdf`;
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      (doc as any).setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${totalPages}`, 200 - 30, (doc as any).internal.pageSize.getHeight() - 10);
    }
    doc.save(name);
  }

  function exportSalesDetailed() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Heaven Bakers`, 14, 16);
    doc.setFontSize(14);
    doc.text(`Sales Report`, 14, 24);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 28, 200, 28);
    let y = 34;
    const filtered = salesById.filter(s => inRange(new Date(s.date)));
    const height = (doc as any).internal.pageSize.getHeight();
    const margin = 14;
    function addLine(text: string, size = 11, bold = false) {
      if (y > height - 20) { doc.addPage(); y = margin; }
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, margin, y);
      y += 6;
    }
    const totalSales = filtered.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const totalProfit = filtered.reduce((acc, s) => acc + (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0), 0);
    const invoiceCount = filtered.length;
    const avgInvoice = invoiceCount ? Number((totalSales / invoiceCount).toFixed(2)) : 0;
    addLine(`Date Range: ${from && to ? `${new Date(from).toLocaleDateString()} - ${new Date(to).toLocaleDateString()}` : 'All Dates'}`, 12, true);
    addLine(`Sales Total: Rs. ${fmt(totalSales)}`, 12);
    addLine(`Profit Total: Rs. ${fmt(totalProfit)}`, 12);
    addLine(`Invoices: ${invoiceCount}`, 12);
    addLine(`Average per Invoice: Rs. ${fmt(avgInvoice)}`, 12);
    addLine(`Generated: ${new Date().toLocaleString()}`, 11);
    y += 4;
    addLine('By Day', 12, true);
    const dayMap: Record<string, { total: number; profit: number; invoices: number }> = {};
    for (const s of filtered) {
      const key = new Date(s.date).toISOString().slice(0,10);
      const prof = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
      if (!dayMap[key]) dayMap[key] = { total: 0, profit: 0, invoices: 0 };
      dayMap[key].total += Number(s.total_amount || 0);
      dayMap[key].profit += prof;
      dayMap[key].invoices += 1;
    }
    const byDay = Object.entries(dayMap).map(([date, v]) => ({ date, total: Number(v.total.toFixed(2)), profit: Number(v.profit.toFixed(2)), invoices: v.invoices }))
      .sort((a,b) => a.date.localeCompare(b.date));
    for (const d of byDay) {
      addLine(`${new Date(d.date).toLocaleDateString()} — Invoices: ${d.invoices}, Total: Rs. ${fmt(d.total)}, Profit: Rs. ${fmt(d.profit)}`);
    }
    y += 4;
    addLine('By Product', 12, true);
    const invNameMap: Record<number, string> = {};
    for (const i of inventoryRows) invNameMap[i.inventory_id] = `${i.product_name || 'Unknown'}${i.brand ? ` (${i.brand})` : ''}`;
    const prodMap: Record<string, { qty: number; revenue: number; profit: number }> = {};
    for (const s of filtered) {
      for (const it of (s.items || [])) {
        const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
        const q = Number(it.qty || 0);
        const rev = Number(it.selling_price || 0) * q;
        const pr = Number(it.profit || 0);
        const cur = prodMap[name] || { qty: 0, revenue: 0, profit: 0 };
        prodMap[name] = { qty: cur.qty + q, revenue: Number((cur.revenue + rev).toFixed(2)), profit: Number((cur.profit + pr).toFixed(2)) };
      }
    }
    const byProduct = Object.entries(prodMap).map(([product, v]) => ({ product, qty: v.qty, revenue: v.revenue, profit: v.profit }))
      .sort((a,b) => b.revenue - a.revenue);
    for (const p of byProduct) {
      addLine(`${p.product} — Qty: ${p.qty}, Revenue: Rs. ${fmt(p.revenue)}, Profit: Rs. ${fmt(p.profit)}`);
    }
    y += 4;
    addLine('Invoices', 12, true);
    for (const s of filtered) {
      const invDate = new Date(s.date).toLocaleDateString();
      const invTotal = Number(s.total_amount || 0);
      const invProfit = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
      const cust = s.customer_name ? String(s.customer_name) : '-';
      const disc = s.discount != null ? `${Number(s.discount)}%` : '-';
      addLine(`Invoice: ${s.sale_invoice_no || '-'} — ${invDate}`, 12, true);
      addLine(`Customer: ${cust} | Discount: ${disc}`);
      addLine(`Total: Rs. ${fmt(invTotal)} | Items: ${(s.items || []).length} | Profit: Rs. ${fmt(invProfit)}`);
      for (const it of (s.items || [])) {
        const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
        const qty = Number(it.qty || 0);
        const sp = Number(it.selling_price || 0);
        const rev = Number((sp * qty).toFixed(2));
        const pr = Number(it.profit || 0);
        addLine(`- ${name}: ${qty} x Rs. ${fmt(sp)} = Rs. ${fmt(rev)} | Profit: Rs. ${fmt(pr)}`);
      }
      y += 2;
    }
    const name = `Heaven_Sales_${from || 'all'}_${to || 'all'}.pdf`;
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      (doc as any).setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${totalPages}`, 200 - 30, (doc as any).internal.pageSize.getHeight() - 10);
    }
    doc.save(name);
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
        <div style={{ fontWeight: 700, fontSize: 24 }}>Reports</div>
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

      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Summary','Sales','Inventory','Purchases'] as const).map(r => (
              <button
                key={r}
                onClick={() => setReport(r)}
                style={{
                  background: report===r ? gold : '#fff',
                  color: report===r ? '#fff' : '#333',
                  border: report===r ? 'none' : '1px solid #ddd',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = report===r ? goldHover : '#f7f7f7')}
                onMouseLeave={e => (e.currentTarget.style.background = report===r ? gold : '#fff')}
              >
                {r}
              </button>
            ))}
          </div>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
          <div style={{ flex: 1 }} />
          <button onClick={exportExcel} style={{ background: gold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onMouseEnter={e => (e.currentTarget.style.background = goldHover)} onMouseLeave={e => (e.currentTarget.style.background = gold)}>Download Excel</button>
          <button onClick={exportPDF} style={{ background: roseGold, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>Download PDF</button>
          <button onClick={exportSalesDetailed} style={{ display: report==='Sales' ? 'inline-block' : 'none', background: '#444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>Download Sales Detailed PDF</button>
        </div>

        <div style={{ display: report==='Summary' ? 'grid' : 'none', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, ${roseGoldLight}, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Sales Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(salesTotal)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #f8e7a5, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: gold, fontWeight: 700, opacity: 0.9 }}>Expenses Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(expensesTotal)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #d9a1aa, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Profit Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(profitTotal)}</div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #e6f0ff, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Purchases Total</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#333' }}>Rs. {fmt(purchasesTotal)}</div>
          </div>
        </div>

        <div style={{ display: report==='Sales' ? 'block' : 'none' }}>
          {(() => {
            const filtered = salesById.filter(s => inRange(new Date(s.date)));
            const invoiceCount = filtered.length;
            const itemsCount = filtered.reduce((acc, s) => acc + (s.items || []).length, 0);
            const avgInvoice = invoiceCount ? Number((salesTotal / invoiceCount).toFixed(2)) : 0;
            const dayMap: Record<string, { total: number; profit: number; invoices: number }> = {};
            for (const s of filtered) {
              const key = new Date(s.date).toISOString().slice(0,10);
              const prof = (s.items || []).reduce((a: number, it: any) => a + Number(it.profit || 0), 0);
              if (!dayMap[key]) dayMap[key] = { total: 0, profit: 0, invoices: 0 };
              dayMap[key].total += Number(s.total_amount || 0);
              dayMap[key].profit += prof;
              dayMap[key].invoices += 1;
            }
            const byDay = Object.entries(dayMap).map(([date, v]) => ({ date, total: Number(v.total.toFixed(2)), profit: Number(v.profit.toFixed(2)), invoices: v.invoices }))
              .sort((a,b) => a.date.localeCompare(b.date));
            const invNameMap: Record<number, string> = {};
            for (const i of inventoryRows) invNameMap[i.inventory_id] = `${i.product_name || 'Unknown'}${i.brand ? ` (${i.brand})` : ''}`;
            const prodMap: Record<string, { qty: number; revenue: number; profit: number }> = {};
            for (const s of filtered) {
              for (const it of (s.items || [])) {
                const name = invNameMap[it.inventory_id] || `ID ${it.inventory_id}`;
                const q = Number(it.qty || 0);
                const rev = Number(it.selling_price || 0) * q;
                const pr = Number(it.profit || 0);
                const cur = prodMap[name] || { qty: 0, revenue: 0, profit: 0 };
                prodMap[name] = { qty: cur.qty + q, revenue: Number((cur.revenue + rev).toFixed(2)), profit: Number((cur.profit + pr).toFixed(2)) };
              }
            }
            const byProduct = Object.entries(prodMap).map(([product, v]) => ({ product, qty: v.qty, revenue: v.revenue, profit: v.profit }))
              .sort((a,b) => b.revenue - a.revenue);
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, ${roseGoldLight}, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Sales Total</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>Rs. {fmt(salesTotal)}</div>
                  </div>
                  <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #d9a1aa, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Profit Total</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>Rs. {fmt(profitTotal)}</div>
                  </div>
                  <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #f7f7f7, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Invoices</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>{invoiceCount}</div>
                  </div>
                  <div style={{ padding: 18, borderRadius: 14, background: `linear-gradient(135deg, #e6f0ff, #fff)`, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    <div style={{ color: roseGold, fontWeight: 700, opacity: 0.9 }}>Avg/Invoice</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>Rs. {fmt(avgInvoice)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: roseGold, marginBottom: 6 }}>By Day</div>
                  {byDay.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#777' }}>No data</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      {byDay.map(d => (
                        <div key={d.date} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 600 }}>{new Date(d.date).toLocaleDateString()}</div>
                            <div style={{ fontSize: 12 }}>Invoices: {d.invoices}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
                            <div>Total: {fmt(d.total)}</div>
                            <div>Profit: {fmt(d.profit)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: roseGold, marginBottom: 6 }}>By Product</div>
                  {byProduct.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#777' }}>No data</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      {byProduct.map(p => (
                        <div key={p.product} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 600 }}>{p.product}</div>
                            <div style={{ fontSize: 12 }}>Qty: {p.qty}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
                            <div>Revenue: {fmt(p.revenue)}</div>
                            <div>Profit: {fmt(p.profit)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {currentRows().length === 0 ? (
            <div style={{ fontSize: 12, color: '#777' }}>No data</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {(currentRows() as any[]).map((r, idx) => (
                <div key={idx} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600 }}>{r.invoice}</div>
                    <div style={{ fontSize: 12 }}>{r.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
                    <div>Total: {fmt(r.total)}</div>
                    <div>Items: {r.items}</div>
                    <div>Profit: {fmt(r.profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: report==='Purchases' ? 'block' : 'none' }}>
          {currentRows().length === 0 ? (
            <div style={{ fontSize: 12, color: '#777' }}>No data</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {(currentRows() as any[]).map((r, idx) => (
                <div key={idx} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600 }}>{r.invoice}</div>
                    <div style={{ fontSize: 12 }}>{r.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
                    <div>Vendor: {r.vendor}</div>
                    <div>Total Bill: {fmt(r.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: report==='Inventory' ? 'block' : 'none' }}>
          {currentRows().length === 0 ? (
            <div style={{ fontSize: 12, color: '#777' }}>No data</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {(currentRows() as any[]).map((r, idx) => (
                <div key={idx} style={{ border: `1px solid ${roseGoldLight}`, borderRadius: 8, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600 }}>{r.product}</div>
                    <div style={{ fontSize: 12 }}>{r.brand}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#555' }}>
                    <div>Vendor: {r.vendor}</div>
                    <div>Qty: {r.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}