import { apiClient } from './client';
import { DiningSession, Order } from '@/types/cafe';
import { InvoiceRecord } from './billing';

export interface DiningSessionDetail extends DiningSession {
  orders: Order[];
  invoice?: InvoiceRecord;
  subtotal: number;
  tax: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
}

export const diningSessionsApi = {
  getSessions: async (status?: string, tableId?: string): Promise<DiningSession[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (tableId) params.set('table_id', tableId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<DiningSession[]>(`/dining-sessions${query}`);
  },

  getSessionDetail: async (sessionId: string): Promise<DiningSessionDetail> => {
    return apiClient<DiningSessionDetail>(`/dining-sessions/${sessionId}`);
  },

  startSession: async (tableId: string): Promise<DiningSession> => {
    return apiClient<DiningSession>(`/dining-sessions/table/${tableId}/start`, {
      method: 'POST',
    });
  },
};
