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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        api.setDemoMode(true);
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('demoMode');
      }
    } else if (token && storedUser) {
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
      if (email === 'admin@hotel.com') {
        localStorage.setItem('demoMode', 'true');
      }
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    api.logout();
    api.setDemoMode(false);
    localStorage.removeItem('user');
    localStorage.removeItem('demoMode');
  };

  const refreshUser = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, hotels(nombre)')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.hotel_id) api.setHotelId(profile.hotel_id);
      const u: User = {
        id: session.user.id,
        email: session.user.email || '',
        nombre: profile?.nombre || session.user.email?.split('@')[0] || '',
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: 'Admin',
        hotelNombre: (profile as any)?.hotels?.nombre || 'Hotel',
      };
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('token', session.access_token);
      localStorage.removeItem('demoMode');
    } catch (e) {
      console.error('refreshUser error', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
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
