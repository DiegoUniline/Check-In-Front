import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { RealtimeBridge } from "@/components/RealtimeBridge";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reservas from "./pages/Reservas";
import Habitaciones from "./pages/Habitaciones";
import Clientes from "./pages/Clientes";
import Limpieza from "./pages/Limpieza";
import Mantenimiento from "./pages/Mantenimiento";
import POS from "./pages/POS";
import Inventario from "./pages/Inventario";
import Productos from "./pages/Productos";
import AjustesStock from "./pages/AjustesStock";
import HistorialAjustes from "./pages/HistorialAjustes";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Turnos from "./pages/Turnos";
import Gastos from "./pages/Gastos";
import Compras from "./pages/Compras";
import Proveedores from "./pages/Proveedores";
import Historial from "./pages/Historial";
import HistorialReservas from "./pages/HistorialReservas";
import NotFound from "./pages/NotFound";
import Catalogos from "./pages/Catalogos";
import Usuarios from "./pages/Usuarios";
import Permisos from "./pages/Permisos";
import Auditoria from "./pages/Auditoria";
import AdminPlataforma from "./pages/AdminPlataforma";
import ReservasOnline from "./pages/ReservasOnline";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MarketingLayout from "@/marketing/layout/MarketingLayout";
import Landing from "@/pages/Landing";
import Funciones from "@/pages/Funciones";
import Precios from "@/pages/Precios";
import Empresa from "@/pages/Empresa";
import Contacto from "@/pages/Contacto";
import Features from "@/marketing/pages/Features";
import Pricing from "@/marketing/pages/Pricing";
import About from "@/marketing/pages/About";
import Contact from "@/marketing/pages/Contact";
import PublicHotel from "./pages/PublicHotel";
import ScrollToTop from "./components/ScrollToTop";
import Chats from "./pages/Chats";
import WhatsAppAgente from "./pages/WhatsAppAgente";
import WhatsAppConexion from "./pages/WhatsAppConexion";
import Temporadas from "./pages/Temporadas";

const queryClient = new QueryClient();

/**
 * Qué hace:
 * - Normaliza el `basename` del Router según el `base` de Vite.
 * Por qué:
 * - En desarrollo: `import.meta.env.BASE_URL` suele ser `/` (queremos basename vacío).
 * - En producción (GitHub Pages): `import.meta.env.BASE_URL` será `/Check-In-Front/` (queremos `/Check-In-Front`).
 * Relacionado con:
 * - `Check-In-Front/vite.config.ts` (propiedad `base`)
 */
const ROUTER_BASENAME =
  (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "";

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.email !== "diego.leon@uniline.mx") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<Landing />} />
    <Route path="/funciones" element={<Funciones />} />
    <Route path="/precios" element={<Precios />} />
    <Route path="/empresa" element={<Empresa />} />
    <Route path="/contacto" element={<Contacto />} />
    <Route element={<MarketingLayout />}>
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
    </Route>
    <Route path="/h/:slug" element={<PublicHotel />} />
    <Route
      path="/admin-plataforma"
      element={
        <ProtectedRoute>
          <SuperAdminRoute>
            <AdminPlataforma />
          </SuperAdminRoute>
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute viewKey="dashboard">
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reservas"
      element={
        <ProtectedRoute viewKey="reservas">
          <Reservas />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reservas/:vista"
      element={
        <ProtectedRoute viewKey="reservas">
          <Reservas />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reservas-online"
      element={
        <ProtectedRoute viewKey="reservas">
          <ReservasOnline />
        </ProtectedRoute>
      }
    />
    <Route
      path="/chats"
      element={
        <ProtectedRoute viewKey="chats">
          <Chats />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/agente"
      element={
        <ProtectedRoute viewKey="configuracion">
          <WhatsAppAgente />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/conexion"
      element={
        <ProtectedRoute viewKey="configuracion">
          <WhatsAppConexion />
        </ProtectedRoute>
      }
    />
    <Route
      path="/habitaciones"
      element={
        <ProtectedRoute viewKey="habitaciones">
          <Habitaciones />
        </ProtectedRoute>
      }
    />
    <Route
      path="/clientes"
      element={
        <ProtectedRoute viewKey="clientes">
          <Clientes />
        </ProtectedRoute>
      }
    />
    <Route
      path="/limpieza"
      element={
        <ProtectedRoute viewKey="limpieza">
          <Limpieza />
        </ProtectedRoute>
      }
    />
    <Route
      path="/mantenimiento"
      element={
        <ProtectedRoute viewKey="mantenimiento">
          <Mantenimiento />
        </ProtectedRoute>
      }
    />
    <Route
      path="/pos"
      element={
        <ProtectedRoute viewKey="pos">
          <POS />
        </ProtectedRoute>
      }
    />
    <Route
      path="/inventario"
      element={
        <ProtectedRoute viewKey="inventario">
          <Inventario />
        </ProtectedRoute>
      }
    />
    <Route
      path="/productos"
      element={
        <ProtectedRoute viewKey="inventario">
          <Productos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ajustes-stock"
      element={
        <ProtectedRoute viewKey="inventario">
          <AjustesStock />
        </ProtectedRoute>
      }
    />
    <Route
      path="/historial-ajustes"
      element={
        <ProtectedRoute viewKey="inventario">
          <HistorialAjustes />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reportes"
      element={
        <ProtectedRoute viewKey="reportes">
          <Reportes />
        </ProtectedRoute>
      }
    />
    <Route
      path="/configuracion"
      element={
        <ProtectedRoute viewKey="configuracion">
          <Configuracion />
        </ProtectedRoute>
      }
    />
    <Route
      path="/catalogos"
      element={
        <ProtectedRoute viewKey="catalogos">
          <Catalogos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/temporadas"
      element={
        <ProtectedRoute viewKey="catalogos">
          <Temporadas />
        </ProtectedRoute>
      }
    />
    <Route
      path="/checkin/:id"
      element={
        <ProtectedRoute viewKey="checkin">
          <CheckIn />
        </ProtectedRoute>
      }
    />
    <Route
      path="/checkout/:id"
      element={
        <ProtectedRoute viewKey="checkout">
          <CheckOut />
        </ProtectedRoute>
      }
    />
    <Route
      path="/turnos"
      element={
        <ProtectedRoute viewKey="turnos">
          <Turnos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/gastos"
      element={
        <ProtectedRoute viewKey="gastos">
          <Gastos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/compras"
      element={
        <ProtectedRoute viewKey="compras">
          <Compras />
        </ProtectedRoute>
      }
    />
    <Route
      path="/proveedores"
      element={
        <ProtectedRoute viewKey="proveedores">
          <Proveedores />
        </ProtectedRoute>
      }
    />
    <Route
      path="/historial"
      element={
        <ProtectedRoute viewKey="historial">
          <Historial />
        </ProtectedRoute>
      }
    />
    <Route
      path="/historial-reservas"
      element={
        <ProtectedRoute viewKey="historial-reservas">
          <HistorialReservas />
        </ProtectedRoute>
      }
    />
    <Route
      path="/usuarios"
      element={
        <ProtectedRoute viewKey="usuarios">
          <Usuarios />
        </ProtectedRoute>
      }
    />
    <Route
      path="/permisos"
      element={
        <ProtectedRoute viewKey="permisos">
          <Permisos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/auditoria"
      element={
        <ProtectedRoute viewKey="auditoria">
          <Auditoria />
        </ProtectedRoute>
      }
    />
    <Route path="/gerencia" element={<Navigate to="/reportes" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <AuthProvider>
          <TooltipProvider>
            <UnsavedChangesProvider>
              <ConfirmProvider>
                <Toaster />
                <Sonner />
                <ScrollToTop />
                <RealtimeBridge />
                <AppRoutes />
              </ConfirmProvider>
            </UnsavedChangesProvider>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
