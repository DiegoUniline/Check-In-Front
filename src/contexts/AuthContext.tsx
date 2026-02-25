import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellidoPaterno?: string;
  rol: string;
  hotelNombre?: string;
  fotoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error, trying demo fallback:', error);
      // Demo fallback: allow demo credentials when backend is unavailable
      if (email === 'admin@hotel.com' && password === 'Admin123!') {
        const demoUser: User = {
          id: 'demo-001',
          email: 'admin@hotel.com',
          nombre: 'Admin Demo',
          apellidoPaterno: 'Hotel',
          rol: 'Admin',
          hotelNombre: 'Hotel Vista Mar',
        };
        setUser(demoUser);
        localStorage.setItem('user', JSON.stringify(demoUser));
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    api.logout();
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
