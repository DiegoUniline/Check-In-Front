import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  viewKey?: string;
}

export function ProtectedRoute({ children, viewKey }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si el usuario está autenticado pero no tiene hotel activo (p. ej. SuperAdmin
  // que aún no seleccionó hotel), evitamos renderizar vistas que consultan por
  // hotel_id y provocarían errores 500/RLS. SuperAdmin va a la vista de admin
  // de plataforma; el resto al login para revisar su perfil.
  const hotelId = typeof window !== 'undefined' ? localStorage.getItem('hotel_id') : null;
  if (!hotelId) {
    if (user?.rol === 'SuperAdmin' && location.pathname !== '/admin-plataforma') {
      return <Navigate to="/admin-plataforma" replace />;
    }
  }

  if (viewKey && !canAccess(viewKey, user?.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}