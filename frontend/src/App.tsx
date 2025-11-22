import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Vendors from './pages/Vendors';
import Purchase from './pages/Purchase';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Loyalty from './pages/Loyalty';

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function Protected({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    function onThemeChange(e: any) {
      const m = e?.detail === 'dark' ? 'dark' : 'light';
      setTheme(m);
    }
    window.addEventListener('theme-change', onThemeChange as any);
    return () => window.removeEventListener('theme-change', onThemeChange as any);
  }, []);
  const bg = theme === 'dark' ? 'linear-gradient(135deg, #0f0f0f, #1a1a1a)' : 'linear-gradient(135deg, #ffe3ea, #ffffff)';
  return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/products" element={<Protected><Products /></Protected>} />
        <Route path="/vendors" element={<Protected><Vendors /></Protected>} />
        <Route path="/purchase" element={<Protected><Purchase /></Protected>} />
        <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
        <Route path="/sales" element={<Protected><Sales /></Protected>} />
        <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
        <Route path="/reports" element={<Protected><Reports /></Protected>} />
        <Route path="/loyalty" element={<Protected><Loyalty /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
