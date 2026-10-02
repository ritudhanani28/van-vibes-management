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
    async function initSession() {
      try {
        const token = localStorage.getItem('vv_mgmt_token');
        if (token) {
          const profile = await authApi.getMe();
          const avatar = profile.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳';
          setUser({ ...profile, avatar });
          wsManager.connect(token);
        }
      } catch {
        localStorage.removeItem('vv_mgmt_token');
        localStorage.removeItem('vv_mgmt_auth');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
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
