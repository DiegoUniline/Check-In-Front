import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AlertaSuscripcion } from '@/components/AlertaSuscripcion';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CommandPalette } from '@/components/CommandPalette';
import { AsistenteVulo } from '@/components/asistente/AsistenteVulo';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

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
          <main
            data-scroll-container
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
