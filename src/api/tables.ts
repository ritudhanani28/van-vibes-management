import { envConfig } from '@/config/env';
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
    const frontendUrl = envConfig.getCustomerFrontendUrl();
    return apiClient<StandeeData>(`/tables/${tableId}/standee?frontend_url=${encodeURIComponent(frontendUrl)}`);
  },

  deleteTable: async (tableId: string): Promise<{ message: string; id: string }> => {
    return apiClient<{ message: string; id: string }>(`/tables/${tableId}`, {
      method: 'DELETE',
    });
  },

  getQrCodeUrl: (tableId: string): string => {
    const frontendUrl = envConfig.getCustomerFrontendUrl();
    return `${API_BASE_URL}/tables/${tableId}/qr?frontend_url=${encodeURIComponent(frontendUrl)}`;
  },

  swipeTable: async (
    sourceTableId: string,
    destinationTableId: string
  ): Promise<{
    message: string;
    sessionId: string;
    sourceTable: TableInfo;
    destinationTable: TableInfo;
    orderIds: string[];
  }> => {
    return apiClient('/tables/swipe', {
      method: 'POST',
      body: JSON.stringify({ sourceTableId, destinationTableId }),
    });
  },
};
