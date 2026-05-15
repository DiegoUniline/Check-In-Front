import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { AlertaSuscripcion } from '@/components/AlertaSuscripcion';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <AlertaSuscripcion />
          <Header title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
