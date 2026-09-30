import { apiClient } from './client';
import { User } from '@/types/auth';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      ...res,
      user: {
        ...res.user,
        contactNumber: res.user?.contactNumber || res.user?.contact_number,
      },
    };
  },

  getMe: async (): Promise<User> => {
    const raw = await apiClient<any>('/auth/me');
    return {
      ...raw,
      contactNumber: raw.contactNumber || raw.contact_number,
    };
  },

  logout: async (): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  getChefs: async (): Promise<User[]> => {
    const list = await apiClient<any[]>('/auth/chefs');
    return list.map((c) => ({
      ...c,
      contactNumber: c.contactNumber || c.contact_number,
    }));
  },

  createChef: async (data: {
    name: string;
    email: string;
    contactNumber: string;
    password: string;
  }): Promise<User> => {
    const res = await apiClient<any>('/auth/chefs', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        contact_number: data.contactNumber,
        password: data.password,
      }),
    });
    return {
      ...res,
      contactNumber: res.contactNumber || res.contact_number,
    };
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_new_password: data.confirmNewPassword,
      }),
    });
  },
};
