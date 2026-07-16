import React, { useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { AuthContext, User } from './auth-context';
import { savePermissions, DEFAULT_PERMISSIONS, PermissionMatrix } from '@/lib/permissions';

async function syncPermisosFromBD() {
  try {
    const remote = await api.getPermisosHotel().catch(() => ({}));
    const merged = { ...DEFAULT_PERMISSIONS, ...(remote as PermissionMatrix) };
    savePermissions(merged);
  } catch {
    // no-op
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
    const bootstrapAuth = async () => {
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
        } finally {
          setIsLoading(false);
        }
        return;
      }

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          api.setDemoMode(false);

          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { session } } = await supabase.auth.getSession();

          if (!session?.user) {
            api.setHotelId(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            return;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*, hotels(nombre, timezone, moneda_codigo, moneda_simbolo, moneda_locale)')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.hotel_id) api.setHotelId(profile.hotel_id);
          else api.setHotelId(null);
          const tz = (profile as any)?.hotels?.timezone;
          if (tz) (await import('@/lib/api')).setHotelTimezone(tz);
          const h0 = (profile as any)?.hotels;
          if (h0) {
            const { setHotelCurrency } = await import('@/lib/currency');
            setHotelCurrency({ codigo: h0.moneda_codigo, simbolo: h0.moneda_simbolo, locale: h0.moneda_locale });
          }

          const { data: roleRow } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .order('role', { ascending: true })
            .limit(1)
            .maybeSingle();

          const hydratedUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            nombre: profile?.nombre || session.user.email?.split('@')[0] || '',
            apellidoPaterno: profile?.apellido_paterno || '',
            rol: (roleRow?.role as string) || 'Admin',
            hotelNombre: (profile as any)?.hotels?.nombre || (session.user.user_metadata?.hotel_nombre as string) || 'Hotel',
          };

          setUser(hydratedUser);
          localStorage.setItem('user', JSON.stringify(hydratedUser));
          localStorage.setItem('token', session.access_token);
          localStorage.removeItem('demoMode');
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          api.setHotelId(null);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Fallback: si hay sesión activa en Supabase aunque no haya token/user en localStorage
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify({ id: session.user.id, email: session.user.email }));
          // Re-ejecuta bootstrap para hidratar perfil completo
          void bootstrapAuth();
          return;
        }
      } catch {}
      setIsLoading(false);
    };

    void bootstrapAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) localStorage.setItem('token', data.token);
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
      if (!session?.user) {
        api.setHotelId(null);
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, hotels(nombre, timezone, moneda_codigo, moneda_simbolo, moneda_locale)')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.hotel_id) api.setHotelId(profile.hotel_id);
      else api.setHotelId(null);
      const tz2 = (profile as any)?.hotels?.timezone;
      if (tz2) (await import('@/lib/api')).setHotelTimezone(tz2);
      const h2 = (profile as any)?.hotels;
      if (h2) {
        const { setHotelCurrency } = await import('@/lib/currency');
        setHotelCurrency({ codigo: h2.moneda_codigo, simbolo: h2.moneda_simbolo, locale: h2.moneda_locale });
      }
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .order('role', { ascending: true })
        .limit(1)
        .maybeSingle();
      const u: User = {
        id: session.user.id,
        email: session.user.email || '',
        nombre: profile?.nombre || session.user.email?.split('@')[0] || '',
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: (roleRow?.role as string) || 'Admin',
        hotelNombre: (profile as any)?.hotels?.nombre || (session.user.user_metadata?.hotel_nombre as string) || 'Hotel',
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
