import { apiClient } from './client';
import { MenuCategory, MenuItem } from '@/types/cafe';

export const menuApi = {
  getCategories: async (): Promise<MenuCategory[]> => {
    return apiClient<MenuCategory[]>('/categories');
  },

  getMenuItems: async (params?: { category?: string; search?: string; is_veg?: boolean }): Promise<MenuItem[]> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.is_veg !== undefined) query.set('is_veg', String(params.is_veg));
    const endpoint = `/menu${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<MenuItem[]>(endpoint);
  },

  createMenuItem: async (item: Partial<MenuItem>): Promise<MenuItem> => {
    return apiClient<MenuItem>('/menu', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
    return apiClient<MenuItem>(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  toggleAvailability: async (id: string, isAvailable: boolean): Promise<MenuItem> => {
    return apiClient<MenuItem>(`/menu/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  },

  deleteMenuItem: async (id: string): Promise<{ message: string; id: string }> => {
    return apiClient<{ message: string; id: string }>(`/menu/${id}`, {
      method: 'DELETE',
    });
  },
};
