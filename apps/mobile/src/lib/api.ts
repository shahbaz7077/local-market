import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getTokens, setTokens } from './storage';

const BASE = process.env.EXPO_PUBLIC_API_URL;
export const api = axios.create({ baseURL: BASE, timeout: 15000 });

let onAuthLost: (() => void) | null = null;
export const setAuthLostHandler = (fn: (() => void) | null) => { onAuthLost = fn; };

export function errorMessage(e: unknown): string {
  const err = e as AxiosError<{ message?: string | string[] }>;
  if (!err.response) return 'Server se connection nahi ho raha. Internet/backend check karo.';
  const m = err.response.data?.message;
  return Array.isArray(m) ? m.join('\n') : (m ?? 'Kuch ghalat ho gaya');
}

api.interceptors.request.use(async (config) => {
  const t = await getTokens();
  if (t?.accessToken) config.headers.Authorization = `Bearer ${t.accessToken}`;
  return config;
});

// Ek waqt mein sirf ek refresh (refresh token rotation ki wajah se zaroori).
let refreshing: Promise<string | null> | null = null;
async function refresh(): Promise<string | null> {
  const t = await getTokens();
  if (!t) return null;
  try {
    const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: t.refreshToken });
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken as string;
  } catch {
    await clearTokens();
    onAuthLost?.();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      refreshing ??= refresh().finally(() => { refreshing = null; });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);