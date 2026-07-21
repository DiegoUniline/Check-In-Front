import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/legal/privacidad", label: "Aviso de Privacidad" },
  { to: "/legal/terminos", label: "Términos y Condiciones" },
  { to: "/legal/seguridad", label: "Seguridad" },
];

export default function LegalLayout({
  title,
  description,
  updated,
  children,
}: {
  title: string;
  description: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <>
      <Helmet>
        <title>{title} · VULO</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="mx-auto w-full max-w-[1360px] px-6 py-16 md:px-10 md:py-24 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Legal
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm transition-colors",
                    pathname === n.to
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <p className="mt-6 text-xs text-muted-foreground">
              Última actualización: {updated}
            </p>
          </aside>
          <article className="min-w-0 max-w-[72ch]">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">{description}</p>
            <div className="prose prose-neutral mt-10 max-w-none text-[15px] leading-[1.75] text-foreground/85 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5 [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-foreground">
              {children}
            </div>
            <div className="mt-16 rounded-2xl border border-border/60 bg-secondary/40 p-6">
              <p className="text-sm text-muted-foreground">
                ¿Dudas sobre este documento? Escríbenos a{" "}
                <a href="mailto:hola@vulo.mx" className="text-primary hover:underline">
                  hola@vulo.mx
                </a>{" "}
                o al WhatsApp{" "}
                <a
                  href="https://wa.me/523171035768"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  +52 317 103 5768
                </a>
                .
              </p>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}