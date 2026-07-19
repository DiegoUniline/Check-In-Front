import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, MessageCircle, X, Sparkles, ChevronRight, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import foxIcon from '@/assets/vulo-fox.png';
import { GUIAS, guiaPorRuta } from './guias';
import { cn } from '@/lib/utils';

const SOPORTE_WA = '523171035768';

export function whatsappSoporteUrl(hotelNombre?: string) {
  const nombre = (hotelNombre || 'mi hotel').trim();
  const msg = `Hola equipo VULO, necesito ayuda con la empresa ${nombre}.`;
  return `https://wa.me/${SOPORTE_WA}?text=${encodeURIComponent(msg)}`;
}

export function AsistenteVulo() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // No mostrar en rutas públicas (marketing/auth)
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/funciones', '/precios', '/empresa', '/contacto', '/features', '/pricing', '/about', '/contact'];
  const isPublic = publicRoutes.some((r) => pathname === r) || pathname.startsWith('/h/');
  if (isPublic) return null;

  const guia = useMemo(() => guiaPorRuta(pathname), [pathname]);
  const Icono = guia.icono;

  return (
    <>
      <button
        aria-label="Abrir asistente VULO"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-50 group',
          'right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-6',
          'h-14 w-14 rounded-full bg-white border border-[#CBD5E1] shadow-[0_10px_40px_rgba(15,23,42,0.15)]',
          'flex items-center justify-center transition-all duration-250 hover:scale-105 hover:shadow-[0_14px_44px_rgba(249,115,22,0.28)]',
          'ring-2 ring-transparent hover:ring-[#F97316]/40',
        )}
      >
        <img src={foxIcon} alt="" className="h-9 w-9 object-contain" />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#F97316] ring-2 ring-white" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[440px] p-0 flex flex-col gap-0 border-l border-[#CBD5E1]"
        >
          <SheetHeader className="px-5 py-4 border-b border-[#CBD5E1] bg-[#10233F] text-white space-y-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                <img src={foxIcon} alt="" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-white text-base font-semibold leading-tight">
                  Asistente VULO
                </SheetTitle>
                <p className="text-xs text-white/70 truncate">
                  {user?.hotelNombre ? `Hotel: ${user.hotelNombre}` : 'Estoy aquí para ayudarte'}
                </p>
              </div>
              <button
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="guia" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-5 mt-4 grid grid-cols-3 bg-[#F8FAFC] rounded-xl p-1 h-10 shrink-0">
              <TabsTrigger value="guia" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Esta vista
              </TabsTrigger>
              <TabsTrigger value="modulos" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Módulos
              </TabsTrigger>
              <TabsTrigger value="soporte" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <LifeBuoy className="h-3.5 w-3.5 mr-1.5" /> Soporte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guia" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
              <ScrollArea className="h-full">
                <div className="px-5 py-5 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                      <Icono className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[#111827] leading-tight">
                        {guia.nombre}
                      </h3>
                      <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                        {guia.proposito}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium mb-1">
                      ¿Cuándo la usas?
                    </p>
                    <p className="text-sm text-[#111827]">{guia.cuando}</p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium mb-3">
                      Paso a paso
                    </p>
                    <ol className="space-y-3">
                      {guia.pasos.map((paso, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="h-6 w-6 rounded-full bg-[#10233F] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#111827]">{paso.titulo}</p>
                            <p className="text-sm text-[#475569] mt-0.5">{paso.detalle}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {guia.tips && guia.tips.length > 0 && (
                    <div className="rounded-2xl border border-[#FDBA74] bg-[#FDBA74]/15 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-[#F97316]" />
                        <p className="text-[11px] uppercase tracking-wide text-[#F97316] font-semibold">Tip</p>
                      </div>
                      <ul className="space-y-1">
                        {guia.tips.map((t, i) => (
                          <li key={i} className="text-sm text-[#111827]">{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#CBD5E1] p-4">
                    <p className="text-sm text-[#475569] mb-3">
                      ¿La guía no resolvió tu duda?
                    </p>
                    <Button
                      asChild
                      className="w-full h-11 rounded-xl bg-[#F97316] hover:bg-[#F97316]/90 text-white"
                    >
                      <a
                        href={whatsappSoporteUrl(user?.hotelNombre)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Escribir a soporte por WhatsApp
                      </a>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="modulos" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
              <ScrollArea className="h-full">
                <div className="px-5 py-5">
                  <p className="text-sm text-[#475569] mb-4">
                    Explora todos los módulos de VULO. Toca cualquiera para ir y ver su guía.
                  </p>
                  <div className="space-y-1.5">
                    {GUIAS.filter((g) => g.ruta !== '__default__' && g.ruta !== '/soporte').map((g) => {
                      const Ic = g.icono;
                      const activo = pathname.startsWith(g.ruta);
                      return (
                        <button
                          key={g.ruta}
                          onClick={() => {
                            navigate(g.ruta);
                            setOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                            'hover:bg-[#F8FAFC] border border-transparent',
                            activo && 'bg-[#F97316]/10 border-[#F97316]/30',
                          )}
                        >
                          <div
                            className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                              activo ? 'bg-[#F97316] text-white' : 'bg-[#F8FAFC] text-[#10233F]',
                            )}
                          >
                            <Ic className="h-4 w-4" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#111827] truncate">
                              {g.nombre}
                            </p>
                            <p className="text-xs text-[#475569] truncate">{g.proposito}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-[#475569] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="soporte" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
              <ScrollArea className="h-full">
                <div className="px-5 py-5 space-y-5">
                  <div className="text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-[#F97316]/10 flex items-center justify-center mb-3">
                      <MessageCircle className="h-8 w-8 text-[#F97316]" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#111827]">
                      ¿Necesitas ayuda humana?
                    </h3>
                    <p className="text-sm text-[#475569] mt-1.5">
                      Escríbenos directo por WhatsApp. Respondemos rápido durante horario de operación.
                    </p>
                  </div>

                  {user?.hotelNombre && (
                    <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4">
                      <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium">
                        Vas a escribir por
                      </p>
                      <p className="text-base font-semibold text-[#111827] mt-1">{user.hotelNombre}</p>
                      <p className="text-xs text-[#475569] mt-2">
                        El mensaje llega prellenado con el nombre de tu hotel para que el equipo te ubique al instante.
                      </p>
                    </div>
                  )}

                  <Button
                    asChild
                    className="w-full h-12 rounded-xl bg-[#F97316] hover:bg-[#F97316]/90 text-white text-base"
                  >
                    <a
                      href={whatsappSoporteUrl(user?.hotelNombre)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Abrir WhatsApp
                    </a>
                  </Button>

                  <div className="rounded-2xl border border-[#CBD5E1] p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium">
                      Contacto directo
                    </p>
                    <p className="text-sm text-[#111827]">WhatsApp: <span className="font-medium">+52 317 103 5768</span></p>
                    <p className="text-sm text-[#111827]">Correo: <a href="mailto:soporte@vulo.mx" className="text-[#F97316] hover:underline">soporte@vulo.mx</a></p>
                    <p className="text-sm text-[#475569]">Autlán de Navarro, Jalisco · México</p>
                  </div>

                  <div className="text-center">
                    <Badge className="rounded-md bg-[#10233F] text-white hover:bg-[#10233F]">
                      Hecho en México
                    </Badge>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}