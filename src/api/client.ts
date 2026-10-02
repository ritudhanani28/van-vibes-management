import { envConfig } from '@/config/env';

export function getApiBaseUrl(): string {
  return envConfig.getApiBaseUrl();
}

export const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('vv_mgmt_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error();
  }

  if (response.status === 401 && typeof window !== 'undefined') {
    // If not already on login page, clear token and redirect
    if (window.location.pathname !== '/login') {
      localStorage.removeItem('vv_mgmt_token');
      localStorage.removeItem('vv_mgmt_auth');
      window.location.replace('/login');
    }
  }

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = text;
  }

  if (!response.ok) {
    const errObj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    const errorMsg =
      (typeof errObj?.detail === "string" ? errObj.detail : null) ||
      (typeof errObj?.message === "string" ? errObj.message : null) ||
      (typeof errObj?.error === "string" ? errObj.error : null) ||
      `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return json as T;
}
