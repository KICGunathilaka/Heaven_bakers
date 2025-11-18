import { useNavigate } from 'react-router-dom';

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
  function goHome() {
    navigate('/dashboard');
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
        <p>Welcome.</p>
      </div>
    </div>
  );
}