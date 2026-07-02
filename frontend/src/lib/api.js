import axios from 'axios';
import { authStorage } from './storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      authStorage.clear();
      window.dispatchEvent(new Event('coopsave:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export const getApiError = (error, fallback = 'Something went wrong.') => {
  return (
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.message ||
    error.message ||
    fallback
  );
};
