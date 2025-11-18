const base = '/api';

export async function get(path: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function post(path: string, data: unknown) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function put(path: string, data: unknown) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}