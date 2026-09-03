import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AlertaSuscripcion } from '@/components/AlertaSuscripcion';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CommandPalette } from '@/components/CommandPalette';
import { AsistenteVulo } from '@/components/asistente/AsistenteVulo';
import { useShift } from '@/contexts/useShift';
import { Button } from '@/components/ui/button';
import { Eye, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { openShift, shiftRequired, viewOnlyMode } = useShift();
  const location = useLocation();
  const readOnlyActive = shiftRequired && !openShift && viewOnlyMode && location.pathname !== '/turnos';

  const explainReadOnly = () => {
    toast.info('Estás en modo de consulta', {
      description: 'Abre un turno para registrar o modificar información.',
      action: { label: 'Abrir turno', onClick: () => { window.location.href = '/turnos'; } },
    });
  };

  const handleReadOnlyClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!readOnlyActive) return;
    const target = event.target as HTMLElement;
    if (target.closest('a[href]')) return;
    const action = target.closest<HTMLElement>('button, [role="menuitem"], [role="button"]');
    if (!action) return;
    const label = `${action.getAttribute('aria-label') || ''} ${action.textContent || ''}`.trim();
    const readOnlyAction = /ver|consultar|detalle|historial|reporte|actualizar|refrescar|buscar|filtrar|filtro|anterior|siguiente|hoy|semana|mes|calendario|lista|cerrar|volver|regresar|expandir|mostrar|ocultar|descargar|exportar|imprimir/i.test(label);
    if (readOnlyAction) return;
    event.preventDefault();
    event.stopPropagation();
    explainReadOnly();
  };

  const handleReadOnlySubmit = (event: React.FormEvent<HTMLElement>) => {
    if (!readOnlyActive) return;
    event.preventDefault();
    event.stopPropagation();
    explainReadOnly();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    const onOpenPalette = () => setPaletteOpen(true);

    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpenPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpenPalette);
    };
  }, []);

  return (
    <SidebarProvider>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <div
        className="flex h-[100dvh] w-full overflow-hidden bg-muted/20"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-background lg:rounded-l-2xl lg:my-2 lg:mr-2 lg:border lg:shadow-sm">
          <OfflineBanner />
          <AlertaSuscripcion />
          <Header title={title} subtitle={subtitle} />
          {readOnlyActive && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200 bg-sky-50 px-3 py-2.5 text-sky-950 lg:px-6">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-800 ring-1 ring-sky-200"><Eye className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Modo sólo consulta</p>
                  <p className="hidden text-xs text-sky-800 sm:block">Puedes recorrer y revisar VULO. Para registrar o modificar información necesitas abrir un turno.</p>
                </div>
              </div>
              <Button asChild size="sm" className="h-8 bg-[#10233F] text-white hover:bg-[#10233F]/90">
                <Link to="/turnos"><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Abrir turno</Link>
              </Button>
            </div>
          )}
          <main
            data-scroll-container
            data-shift-read-only={readOnlyActive ? 'true' : undefined}
            onClickCapture={handleReadOnlyClick}
            onSubmitCapture={handleReadOnlySubmit}
            className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6 min-w-0 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-7"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
          >
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </main>
        </SidebarInset>
        <MobileBottomNav />
        <AsistenteVulo />
      </div>
    </SidebarProvider>
  );
}
