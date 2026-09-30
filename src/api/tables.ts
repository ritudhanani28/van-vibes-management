import { apiClient, API_BASE_URL } from './client';
import { TableInfo, TableStatus } from '@/types/cafe';

export interface StandeeData {
  table_id: string;
  table_number: number;
  name: string;
  capacity: number;
  scan_url: string;
  qr_image_url: string;
}

export const tablesApi = {
  getTables: async (): Promise<TableInfo[]> => {
    return apiClient<TableInfo[]>('/tables');
  },

  createTable: async (tableNumber: number, capacity: number = 4): Promise<TableInfo> => {
    return apiClient<TableInfo>('/tables', {
      method: 'POST',
      body: JSON.stringify({ tableNumber, capacity }),
    });
  },

  updateStatus: async (tableId: string, status: TableStatus): Promise<TableInfo> => {
    return apiClient<TableInfo>(`/tables/${tableId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getStandeeData: async (tableId: string): Promise<StandeeData> => {
    return apiClient<StandeeData>(`/tables/${tableId}/standee`);
  },

  deleteTable: async (tableId: string): Promise<{ message: string; id: string }> => {
    return apiClient<{ message: string; id: string }>(`/tables/${tableId}`, {
      method: 'DELETE',
    });
  },

  getQrCodeUrl: (tableId: string): string => {
    return `${API_BASE_URL}/tables/${tableId}/qr`;
  },
};
