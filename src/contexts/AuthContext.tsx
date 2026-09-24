import { clearOfflineCache } from '@/lib/offlineCache';
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, User } from './auth-context';
import { savePermissions, resetPermissions, PermissionMatrix } from '@/lib/permissions';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// Permisos = valores por defecto + lo guardado en la base para el hotel.
async function syncPermisosFromBD() {
  try {
    const remote = await api.getPermisosHotel();
    resetPermissions();
    savePermissions((remote || {}) as PermissionMatrix);
  } catch {
    // Sin conexión: se mantienen los permisos ya leídos en esta sesión.
  }
}

const readCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
};

const clearLocalSessionData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('demoMode');
  api.setHotelId(null);
};

/**
 * Lee perfil, hotel y rol del usuario de la sesión. Lanza si la red falla:
 * quien llama decide conservar la sesión, nunca cerrarla por un error.
 */
async function hydrateFromSession(session: Session): Promise<User> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, hotels!profiles_hotel_id_fkey(nombre, timezone, moneda_codigo, moneda_simbolo, moneda_locale)')
    .eq('id', session.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const activeHotelId = (profile as any)?.hotel_activo_id || profile?.hotel_id || null;
  api.setHotelId(activeHotelId);
  let hotel: any = (profile as any)?.hotels;
  if (activeHotelId && activeHotelId !== profile?.hotel_id) {
    const { data: hActivo } = await supabase
      .from('hotels')
      .select('nombre, timezone, moneda_codigo, moneda_simbolo, moneda_locale')
      .eq('id', activeHotelId)
      .maybeSingle();
    if (hActivo) hotel = hActivo;
  }
  if (hotel?.timezone) (await import('@/lib/api')).setHotelTimezone(hotel.timezone);
  if (hotel) {
    const { setHotelCurrency } = await import('@/lib/currency');
    setHotelCurrency({ codigo: hotel.moneda_codigo, simbolo: hotel.moneda_simbolo, locale: hotel.moneda_locale });
  }

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .order('role', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (roleError) throw roleError;

  const hydrated: User = {
    id: session.user.id,
    email: session.user.email || '',
    nombre: profile?.nombre || session.user.email?.split('@')[0] || '',
    apellidoPaterno: profile?.apellido_paterno || '',
    rol: (roleRow?.role as string) || 'Recepcion',
    hotelNombre: hotel?.nombre || (session.user.user_metadata?.hotel_nombre as string) || 'Hotel',
  };
  localStorage.setItem('user', JSON.stringify(hydrated));
  localStorage.setItem('token', session.access_token);
  localStorage.removeItem('demoMode');
  return hydrated;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permisosVersion, setPermisosVersion] = useState(0);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  // Cierre voluntario en curso: evita rehidratar mientras se sale.
  const loggingOutRef = useRef(false);

  const recargarPermisos = async () => {
    await syncPermisosFromBD();
    setPermisosVersion((v) => v + 1);
  };
  // Si un administrador cambia permisos, se aplican sin volver a iniciar sesión.
  useRealtimeSync('permisos_hotel', () => void recargarPermisos(), { enabled: Boolean(user) });

  const endSession = () => {
    setUser(null);
    clearLocalSessionData();
    clearOfflineCache();
    resetPermissions();
  };

  /** Rehidrata; si falla por red se conserva el usuario actual. */
  const tryHydrate = async (session: Session) => {
    try {
      const hydrated = await hydrateFromSession(session);
      setUser(hydrated);
      await recargarPermisos();
      return true;
    } catch (error) {
      console.warn('[auth] no se pudo actualizar el perfil; se conserva la sesión', error);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // Modo demo: sesión local sin Supabase.
      if (localStorage.getItem('demoMode') === 'true') {
        const cached = readCachedUser();
        if (cached) {
          api.setDemoMode(true);
          setUser(cached);
        } else {
          localStorage.removeItem('demoMode');
        }
        setIsLoading(false);
        return;
      }

      const cached = readCachedUser();
      if (cached) setUser(cached);

      // La fuente de verdad es la sesión de Supabase (se renueva sola con el
      // refresh token). Sólo se considera cerrada si Supabase lo confirma.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (isAuthRetryableFetchError(error) || offline) {
          // Sin conexión o servidor caído: la sesión sigue; se renovará al volver la red.
          console.warn('[auth] no se pudo validar la sesión; se conserva', error);
          if (cached) await recargarPermisos();
          setIsLoading(false);
          return;
        }
        // El servidor rechazó la sesión (revocada o vencida de verdad).
        endSession();
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        if (cached) endSession();
        setIsLoading(false);
        return;
      }

      const ok = await tryHydrate(data.session);
      if (!ok) {
        if (!cached) {
          // Sin copia local ni perfil: se usa lo mínimo de la sesión para no sacar al usuario.
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            nombre: data.session.user.email?.split('@')[0] || '',
            rol: 'Recepcion',
          });
        }
        await recargarPermisos();
      }
      if (!cancelled) setIsLoading(false);
    };

    void bootstrap();

    // Cambios de sesión: otra pestaña, renovación del token o cierre real.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        localStorage.setItem('token', session.access_token);
        return;
      }
      if (event === 'SIGNED_OUT') {
        if (localStorage.getItem('demoMode') === 'true') return;
        // Supabase sólo emite SIGNED_OUT cuando la sesión terminó de verdad:
        // botón de salir (aquí o en otra pestaña) o revocación en el servidor.
        endSession();
        return;
      }
      if (event === 'SIGNED_IN' && session && !userRef.current && !loggingOutRef.current) {
        // Inicio de sesión en otra pestaña: se aplica aquí sin recargar.
        setTimeout(() => { void tryHydrate(session); }, 0);
      }
    });

    // Al volver la conexión se rehidrata sin cerrar nada.
    const onOnline = () => {
      if (!userRef.current || localStorage.getItem('demoMode') === 'true') return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) void tryHydrate(data.session);
      });
    };
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener('online', onOnline);
    };
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
      await recargarPermisos();
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    loggingOutRef.current = true;
    endSession();
    api.setDemoMode(false);
    // Cierra sólo en este equipo; los demás dispositivos siguen conectados.
    void api.logout().finally(() => { loggingOutRef.current = false; });
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return;
    if (!data.session) {
      endSession();
      return;
    }
    await tryHydrate(data.session);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
      permisosVersion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
