import { envConfig } from '@/config/env';

export function getApiBaseUrl(): string {
  return envConfig.getApiBaseUrl();
}

export const API_BASE_URL = getApiBaseUrl();

export interface IncompleteOrderItem {
  order_id?: string;
  orderId?: string;
  order_number?: string;
  orderNumber?: string;
  table_number?: number;
  tableNumber?: number;
  status: string;
  items?: Array<{ name: string; quantity: number }>;
}

export class ApiError extends Error {
  statusCode: number;
  get status(): number {
    return this.statusCode;
  }
  code?: string;
  fieldErrors: Record<string, string>;
  incomplete_orders?: IncompleteOrderItem[];
  data?: unknown;

  constructor(message: string, statusCode: number, rawData?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = rawData;
    this.fieldErrors = {};

    if (rawData && typeof rawData === 'object') {
      const obj = rawData as Record<string, unknown>;
      const dataObj = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : null;
      this.code =
        (typeof obj.code === 'string' ? obj.code : undefined) ||
        (typeof dataObj?.code === 'string' ? dataObj.code : undefined);

      const incOrders = (
        Array.isArray(obj.incomplete_orders)
          ? obj.incomplete_orders
          : dataObj && Array.isArray(dataObj.incomplete_orders)
          ? dataObj.incomplete_orders
          : undefined
      ) as IncompleteOrderItem[] | undefined;

      if (Array.isArray(incOrders)) {
        this.incomplete_orders = incOrders;
      }

      // Extract field-level errors from backend responses
      if (obj.fieldErrors && typeof obj.fieldErrors === 'object') {
        this.fieldErrors = { ...(obj.fieldErrors as Record<string, string>) };
      } else if (Array.isArray(obj.errors)) {
        for (const item of obj.errors) {
          if (item && typeof item === 'object' && 'field' in item && 'message' in item) {
            this.fieldErrors[String(item.field)] = String(item.message);
          }
        }
      }
    }
  }
}

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
    // Graceful network and server unreachable error handling
    throw new ApiError(
      'Unable to connect to the server. Please try again.',
      0
    );
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
    const errObj = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
    let errorMsg =
      (typeof errObj?.detail === 'string' ? errObj.detail : null) ||
      (typeof errObj?.message === 'string' ? errObj.message : null) ||
      (typeof errObj?.error === 'string' ? errObj.error : null);

    if (!errorMsg) {
      if (response.status === 401) {
        errorMsg = 'Invalid email or password.';
      } else if (response.status === 403) {
        errorMsg = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMsg = 'The requested resource was not found.';
      } else if (response.status === 409) {
        errorMsg = 'A conflict occurred with existing data.';
      } else if (response.status >= 500) {
        errorMsg = 'An unexpected error occurred. Please try again later.';
      } else {
        errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
      }
    }
    throw new ApiError(errorMsg, response.status, json);
  }

  return json as T;
}
