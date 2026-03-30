import { createContext } from 'react';

import type { AuthUser } from '../types';

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
