const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}

export const Interview = {
  list: (sortBy = '-created_date', limit = 200) =>
    apiFetch(`/interviews?sort=${sortBy}&limit=${limit}`),
  get: (id) =>
    apiFetch(`/interviews/${id}`),
  create: (data) =>
    apiFetch('/interviews', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiFetch(`/interviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const invokeInterviewChat = (payload) =>
  apiFetch('/interview-chat', { method: 'POST', body: JSON.stringify(payload) });
