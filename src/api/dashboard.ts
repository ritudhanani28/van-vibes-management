import { apiClient } from './client';
import { Order } from '@/types/cafe';

export interface DashboardSummary {
  totalOrders: number;
  kitchenPending: number;
  occupiedTables: number;
  totalTables: number;
  settledRevenue: number;
  recentOrders: Order[];
}

export interface KitchenSummary {
  incomingOrders: number;
  activePrep: number;
  completedToday: number;
}

export const dashboardApi = {
  getSummary: async (range?: string): Promise<DashboardSummary> => {
    const q = range ? `?range=${encodeURIComponent(range)}` : '';
    return apiClient<DashboardSummary>(`/dashboard/summary${q}`);
  },

  getKitchenSummary: async (): Promise<KitchenSummary> => {
    return apiClient<KitchenSummary>('/dashboard/kitchen');
  },
};
