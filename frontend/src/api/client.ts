import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 min for LSTM training
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/v1/auth/register', data),

  login: (username: string, password: string) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    return api.post('/api/v1/auth/token', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getMe: () => api.get('/api/v1/auth/me'),
};

// ── Stock API ─────────────────────────────────────────────────────────────────
export const stockAPI = {
  uploadCSV: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/v1/stock/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  predict: (fileId: string, days: number, retrain = false) =>
    api.post('/api/v1/stock/predict', {
      file_id: fileId,
      prediction_days: days,
      retrain,
    }),

  listFiles: () => api.get('/api/v1/stock/files'),

  getFileStats: (fileId: string) =>
    api.get(`/api/v1/stock/files/${fileId}/stats`),
};
