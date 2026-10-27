import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // An expired admin session sends the admin back to sign in. Public pages
    // never need a token, so they are left alone.
    if (err.response?.status === 401 && location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;
