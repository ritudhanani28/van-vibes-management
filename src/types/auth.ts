export type UserRole = 'ADMIN' | 'CHEF';

export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  contact_number?: string;
  role: UserRole;
  avatar?: string;
  shift?: string;
  assignedStation?: string;
  is_active?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
