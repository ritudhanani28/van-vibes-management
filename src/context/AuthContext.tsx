'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/auth';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/api/auth';
import { wsManager } from '@/services/websocket/WebSocketManager';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: { name: string; contactNumber?: string }) => Promise<{ success: boolean; error?: string }>;
  canAccess: (requiredRole?: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from backend via stored JWT on mount
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('vv_mgmt_token') : null;
        if (token) {
          const profile = await authApi.getMe();
          if (!isMounted) return;
          const avatar = profile.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
          setUser({ ...profile, avatar });
          wsManager.connect(token);
        }
      } catch (err) {
        if (typeof window !== 'undefined') {
          const errMsg = err instanceof Error ? err.message : '';
          if (errMsg.includes('401') || errMsg.includes('Unauthorized') || errMsg.includes('Authentication token')) {
            localStorage.removeItem('vv_mgmt_token');
            localStorage.removeItem('vv_mgmt_auth');
          }
        }
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await authApi.login(email.trim(), pass);
        const avatar = res.user.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
        const userObj: User = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as UserRole,
          shift: res.user.shift || (res.user.role === 'ADMIN' ? 'Morning & Evening' : 'Kitchen Main Shift'),
          assignedStation:
            res.user.assignedStation ||
            (res.user.role === 'ADMIN' ? 'Operations & Management' : 'Head Chef (Hot Line & Espresso)'),
          avatar,
        };

        localStorage.setItem('vv_mgmt_token', res.access_token);
        localStorage.setItem(
          'vv_mgmt_auth',
          JSON.stringify({
            email: userObj.email,
            role: userObj.role,
            timestamp: Date.now(),
          })
        );

        setUser(userObj);
        wsManager.connect(res.access_token);

        // Redirect based on authoritative role
        if (userObj.role === 'CHEF') {
          router.push('/chef');
        } else {
          router.push('/dashboard');
        }

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid credentials. Please check your email and password.';
        return {
          success: false,
          error: msg,
        };
      }
    },
    [router]
  );

  const updateProfile = useCallback(
    async (data: { name: string; contactNumber?: string }): Promise<{ success: boolean; error?: string }> => {
      try {
        const updated = await authApi.updateProfile(data);
        const avatar = updated.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
        setUser((prev) => (prev ? { ...prev, ...updated, avatar } : null));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update profile.';
        return { success: false, error: msg };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    wsManager.disconnect();
    try {
      localStorage.removeItem('vv_mgmt_token');
      localStorage.removeItem('vv_mgmt_auth');
    } catch {
      // ignore
    }
    router.push('/login');
  }, [router]);

  const canAccess = useCallback(
    (requiredRole?: UserRole | UserRole[]) => {
      if (!user) return false;
      if (!requiredRole) return true;
      if (user.role === 'ADMIN') return true;
      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
      }
      return user.role === requiredRole;
    },
    [user]
  );

  // Auto-protect routes when loaded
  useEffect(() => {
    if (isLoading) return;
    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        canAccess,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
