import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  rol: 'SuperAdmin' | 'Admin' | 'Gerente' | 'Recepcion' | 'Housekeeping' | 'Mantenimiento' | 'Contador';
  fotoUrl?: string;
  hotelId: string;
  hotelNombre: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development
const mockUser: User = {
  id: 'usr-001',
  email: 'admin@hotel.com',
  nombre: 'Carlos',
  apellidoPaterno: 'Mendoza',
  apellidoMaterno: 'García',
  rol: 'Admin',
  hotelId: 'htl-001',
  hotelNombre: 'Hotel Vista Mar',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedAuth = localStorage.getItem('hotel_auth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.user) {
          setUser(parsed.user);
        }
      } catch (e) {
        localStorage.removeItem('hotel_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock validation
    if (email === 'admin@hotel.com' && password === 'Admin123!') {
      setUser(mockUser);
      localStorage.setItem('hotel_auth', JSON.stringify({ user: mockUser }));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hotel_auth');
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