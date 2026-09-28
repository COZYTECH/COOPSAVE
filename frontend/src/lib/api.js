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

    if (status === 429) {
      error.rateLimited = true;
      error.userMessage = 'Too many requests. Please wait a moment and try again.';
    }

    return Promise.reject(error);
  }
);

export const getApiError = (error, fallback = 'Something went wrong.') => {
  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  const responseData = error?.response?.data;
  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof responseData?.errors?.[0]?.message === 'string'
    && responseData.errors[0].message.trim()) {
    return responseData.errors[0].message;
  }

  return fallback;
};
