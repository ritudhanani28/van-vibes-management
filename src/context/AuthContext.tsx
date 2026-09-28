'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccess: (requiredRole?: UserRole | UserRole[]) => boolean;
}

const DEMO_USERS: Record<string, { pass: string; user: User }> = {
  'admin@vaanvibes.com': {
    pass: 'admin123',
    user: {
      id: 'usr_admin_01',
      name: 'Rahul Verma',
      email: 'admin@vaanvibes.com',
      role: 'ADMIN',
      avatar: '👨‍💼',
      shift: 'Morning & Evening (General Manager)',
      assignedStation: 'Operations & Management',
    },
  },
  'chef@vaanvibes.com': {
    pass: 'chef123',
    user: {
      id: 'usr_chef_01',
      name: 'Chef Vikram Joshi',
      email: 'chef@vaanvibes.com',
      role: 'CHEF',
      avatar: '👨‍🍳',
      shift: 'Kitchen Main Shift',
      assignedStation: 'Head Chef (Hot Line & Espresso)',
    },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vv_mgmt_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && DEMO_USERS[parsed.email]) {
          setUser(DEMO_USERS[parsed.email].user);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      const account = DEMO_USERS[cleanEmail];

      if (!account || account.pass !== pass) {
        return {
          success: false,
          error: 'Invalid credentials. Please check your email and password.',
        };
      }

      setUser(account.user);
      try {
        localStorage.setItem(
          'vv_mgmt_auth',
          JSON.stringify({
            email: account.user.email,
            role: account.user.role,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore
      }

      // Redirect based on role
      if (account.user.role === 'CHEF') {
        router.push('/chef');
      } else {
        router.push('/dashboard');
      }

      return { success: true };
    },
    [router]
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
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
      // Admin has full clearance across all management and operational portals (including Chef Board)
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
