import { apiClient } from './client';
import { Order, OrderStatus } from '@/types/cafe';

export const ordersApi = {
  getOrders: async (params?: { status?: string; table_id?: string; range?: string; activity_status?: string }): Promise<Order[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.table_id) query.set('table_id', params.table_id);
    if (params?.range) query.set('range', params.range);
    if (params?.activity_status && params.activity_status !== 'ALL') query.set('activity_status', params.activity_status);
    const endpoint = `/orders${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<Order[]>(endpoint);
  },

  getOrder: async (id: string): Promise<Order> => {
    return apiClient<Order>(`/orders/${id}`);
  },

  acceptOrder: async (orderId: string): Promise<Order> => {
    return apiClient<Order>(`/orders/${orderId}/accept`, {
      method: 'POST',
    });
  },

  doneOrder: async (orderId: string): Promise<Order> => {
    return apiClient<Order>(`/orders/${orderId}/done`, {
      method: 'POST',
    });
  },

  serveOrder: async (orderId: string): Promise<Order> => {
    return apiClient<Order>(`/orders/${orderId}/serve`, {
      method: 'POST',
    });
  },

  completeOrder: async (orderId: string): Promise<Order> => {
    return apiClient<Order>(`/orders/${orderId}/complete`, {
      method: 'POST',
    });
  },

  updateStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    return apiClient<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  cancelOrder: async (orderId: string, reason?: string): Promise<{ message: string; order: Order }> => {
    return apiClient<{ message: string; order: Order }>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
