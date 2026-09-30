import { apiClient } from './client';
import { BillData } from '@/types/cafe';

export interface InvoiceRecord {
  id: string;
  orderId?: string | null;
  diningSessionId?: string | null;
  billType?: string;
  invoiceNumber: string;
  tableNumber?: number;
  customerName?: string;
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  taxAmount: number;
  discountPercentage?: number;
  discountAmount?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  settledAt?: string;
  createdAt: string;
  tableStatus?: string | null;
}

export const billingApi = {
  getLedger: async (): Promise<InvoiceRecord[]> => {
    return apiClient<InvoiceRecord[]>('/billing/ledger');
  },

  getPendingPayments: async (): Promise<InvoiceRecord[]> => {
    return apiClient<InvoiceRecord[]>('/billing/pending');
  },

  getBillReceipt: async (orderId: string): Promise<BillData> => {
    return apiClient<BillData>(`/billing/${orderId}`);
  },

  generateBill: async (orderId: string, discountPercentage?: number): Promise<BillData> => {
    return apiClient<BillData>(`/billing/${orderId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        discount_percentage: discountPercentage ?? 0,
        discountPercentage: discountPercentage ?? 0,
      }),
    });
  },

  settlePayment: async (orderId: string, paymentMethod: string): Promise<InvoiceRecord> => {
    return apiClient<InvoiceRecord>(`/billing/${orderId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  },

  // Dining Session Billing APIs
  getSessionReceipt: async (sessionId: string): Promise<BillData> => {
    return apiClient<BillData>(`/billing/sessions/${sessionId}`);
  },

  generateSessionBill: async (sessionId: string, discountPercentage?: number): Promise<BillData> => {
    return apiClient<BillData>(`/billing/sessions/${sessionId}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        discount_percentage: discountPercentage ?? 0,
        discountPercentage: discountPercentage ?? 0,
      }),
    });
  },

  settleSessionPayment: async (sessionId: string, paymentMethod: string): Promise<InvoiceRecord> => {
    return apiClient<InvoiceRecord>(`/billing/sessions/${sessionId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  },
};
