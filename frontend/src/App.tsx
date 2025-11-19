import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Vendors from './pages/Vendors';
import Purchase from './pages/Purchase';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function Protected({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}