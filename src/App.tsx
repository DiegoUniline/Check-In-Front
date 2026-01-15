import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reservas from "./pages/Reservas";
import Habitaciones from "./pages/Habitaciones";
import Clientes from "./pages/Clientes";
import Limpieza from "./pages/Limpieza";
import Mantenimiento from "./pages/Mantenimiento";
import POS from "./pages/POS";
import Inventario from "./pages/Inventario";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Turnos from "./pages/Turnos";
import Gastos from "./pages/Gastos";
import Compras from "./pages/Compras";
import Historial from "./pages/Historial";
import HistorialReservas from "./pages/HistorialReservas";
import NotFound from "./pages/NotFound";
import Catalogos from "./pages/Catalogos";
import Usuarios from "./pages/Usuarios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/Check-In-Front">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservas"
                element={
                  <ProtectedRoute>
                    <Reservas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/habitaciones"
                element={
                  <ProtectedRoute>
                    <Habitaciones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/limpieza"
                element={
                  <ProtectedRoute>
                    <Limpieza />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mantenimiento"
                element={
                  <ProtectedRoute>
                    <Mantenimiento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventario"
                element={
                  <ProtectedRoute>
                    <Inventario />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute>
                    <Reportes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracion"
                element={
                  <ProtectedRoute>
                    <Configuracion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalogos"
                element={
                  <ProtectedRoute>
                    <Catalogos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkin/:id"
                element={
                  <ProtectedRoute>
                    <CheckIn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout/:id"
                element={
                  <ProtectedRoute>
                    <CheckOut />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/turnos"
                element={
                  <ProtectedRoute>
                    <Turnos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gastos"
                element={
                  <ProtectedRoute>
                    <Gastos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compras"
                element={
                  <ProtectedRoute>
                    <Compras />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/historial"
                element={
                  <ProtectedRoute>
                    <Historial />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/historial-reservas"
                element={
                  <ProtectedRoute>
                    <HistorialReservas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute>
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
