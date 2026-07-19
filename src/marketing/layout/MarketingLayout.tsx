import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SiteNav } from "@/marketing/components/SiteNav";
import { SiteFooter } from "@/marketing/components/SiteFooter";

export default function MarketingLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return (
    <div className="min-h-dvh bg-background font-[Inter,system-ui,sans-serif] text-foreground antialiased">
      <SiteNav />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}