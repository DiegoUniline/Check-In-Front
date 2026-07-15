import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AlertaSuscripcion } from '@/components/AlertaSuscripcion';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CommandPalette } from '@/components/CommandPalette';

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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <SidebarProvider>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <div
        className="flex h-[100dvh] w-full overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          <OfflineBanner />
          <AlertaSuscripcion />
          <Header title={title} subtitle={subtitle} />
          <main
            data-scroll-container
            className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 min-w-0 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-6"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
          >
            {children}
          </main>
        </SidebarInset>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
