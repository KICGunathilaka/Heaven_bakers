import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  function logout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }
  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      <p>Welcome.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}