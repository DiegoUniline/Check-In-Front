import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AlertaSuscripcion } from '@/components/AlertaSuscripcion';
import { MobileBottomNav } from './MobileBottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div
        className="flex min-h-[100dvh] w-full overflow-x-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <AlertaSuscripcion />
          <Header title={title} subtitle={subtitle} />
          <main
            className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 min-w-0 pb-24 lg:pb-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
          >
            {children}
          </main>
        </SidebarInset>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
