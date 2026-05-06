// src/api.js
const BASE = 'http://localhost:5000/api';
let _token = localStorage.getItem('token') || '';

export const setToken = (t) => {
  _token = t;
  localStorage.setItem('token', t);
};

export const getToken = () => _token;

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const login              = (email, password)       => req('POST', '/auth/login', { email, password });
export const getDashboardStats  = ()                      => req('GET',  '/admin/stats');
export const getSpamNumbers     = (page = 1, limit = 20)  => req('GET',  `/admin/spam-numbers?page=${page}&limit=${limit}`);
export const deleteSpamNumber   = (id)                    => req('DELETE', `/admin/spam-numbers/${id}`);
export const getReports         = (page = 1, limit = 100) => req('GET',  `/admin/reports?page=${page}&limit=${limit}`);
export const getPendingMessages = ()                      => req('GET',  '/admin/pending-messages');
export const reviewMessage      = (id, decision)          => req('PATCH', `/admin/pending-messages/${id}/review`, { decision });
export const getWeeklyStats     = ()                      => req('GET',  '/analytics/weekly');

// ADDED: fetch all cached messages for admin Messages page
export const getAllCachedMessages = (page = 1, limit = 200) =>
  req('GET', `/cache/admin/messages?page=${page}&limit=${limit}`);