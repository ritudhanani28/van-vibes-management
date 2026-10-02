import { apiClient } from './client';
import { MenuCategory, MenuItem } from '@/types/cafe';

export const menuApi = {
  getCategories: async (): Promise<MenuCategory[]> => {
    return apiClient<MenuCategory[]>('/categories');
  },

  createCategory: async (category: {
    id?: string;
    name: string;
    slug?: string;
    icon?: string;
    page?: number;
    display_order?: number;
    is_active?: boolean;
  }): Promise<MenuCategory> => {
    const slug =
      category.slug ||
      category.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const id = category.id || slug;
    return apiClient<MenuCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        id,
        name: category.name.trim(),
        slug,
        icon: category.icon || '🍽️',
        page: category.page ?? 2,
        display_order: category.display_order ?? 0,
        is_active: category.is_active ?? true,
      }),
    });
  },

  deleteCategory: async (categoryId: string): Promise<{ message: string; id: string }> => {
    return apiClient<{ message: string; id: string }>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
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
