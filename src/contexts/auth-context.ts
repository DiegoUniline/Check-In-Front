import { createContext } from 'react';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellidoPaterno?: string;
  rol: string;
  hotelNombre?: string;
  fotoUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);