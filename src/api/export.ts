import { getApiBaseUrl } from './client';

export type ExportCategory =
  | 'orders'
  | 'order_items'
  | 'bills'
  | 'payments'
  | 'menu_items'
  | 'tables'
  | 'staff';

export type ExportDateRange =
  | 'last_1_day'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom'
  | 'all_time';

export interface ExportFilters {
  orderStatus?: string;
  orderId?: string;
  tableNumber?: number;
  billPaymentStatus?: string;
  billPaymentMethod?: string;
  billNumber?: string;
  menuCategory?: string;
  menuAvailability?: boolean;
  tableStatus?: string;
  staffRole?: string;
}

export interface ExportRequest {
  categories: string[];
  dateRange: ExportDateRange;
  startDate?: string;
  endDate?: string;
  filters?: ExportFilters;
}

export interface ExportPreviewResponse {
  counts: Record<string, number>;
  total_records: number;
  date_range_label: string;
  start_date?: string;
  end_date?: string;
}

function getExportEndpoint(subpath: string): string {
  const rawBase = getApiBaseUrl().replace(/\/+$/, '');
  const apiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;
  const cleanSub = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `${apiBase}${cleanSub}`;
}

export const exportApi = {
  async preview(payload: ExportRequest): Promise<ExportPreviewResponse> {
    const url = getExportEndpoint('/export/preview');
    const token =
      typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? localStorage.getItem('vv_mgmt_token')
        : null;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errMsg = `Preview failed (${res.status})`;
      try {
        const j = await res.json();
        errMsg = j.detail || j.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }
    return res.json();
  },

  async download(payload: ExportRequest): Promise<{ success: boolean; filename: string }> {
    const url = getExportEndpoint('/export/download');
    const token =
      typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? localStorage.getItem('vv_mgmt_token')
        : null;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errMsg = `Export failed (${res.status})`;
      try {
        const j = await res.json();
        errMsg = j.detail || j.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    let filename =
      payload.categories.length === 1
        ? `van-vibes-${payload.categories[0]}.csv`
        : 'van-vibes-export.zip';

    const disposition = res.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return { success: true, filename };
  },
};
