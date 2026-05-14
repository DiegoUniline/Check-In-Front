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

  if (viewKey && !canAccess(viewKey, user?.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}