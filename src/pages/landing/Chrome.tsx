import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import wordmark from '@/assets/vulo-wordmark.png';
import { Phone, MapPin } from 'lucide-react';

export const NAVY = '#10233F';
export const ORANGE = '#F97316';
export const ease = [0.22, 1, 0.36, 1] as const;

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 text-[12px] font-semibold uppercase tracking-[0.24em]" style={{ color: ORANGE }}>
      {children}
    </div>
  );
}

const NAV_LINKS: Array<[string, string]> = [
  ['Funciones', '/funciones'],
  ['Precios', '/precios'],
  ['Empresa', '/empresa'],
  ['Contacto', '/contacto'],
];

export function LandingNav() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <img src={wordmark} alt="VULO" className="h-5 w-auto object-contain md:h-6" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className={`text-[14px] font-medium transition hover:text-slate-900 ${active ? 'text-slate-900' : 'text-slate-600'}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-[14px] font-medium text-slate-600 transition hover:text-slate-900 sm:block">
            Iniciar sesión
          </Link>
          <Button
            asChild
            size="sm"
            className="h-10 rounded-full px-5 text-[14px] font-medium text-white shadow-none hover:opacity-95"
            style={{ background: NAVY }}
          >
            <Link to="/contacto">Agendar demo</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  const cols: Array<{ t: string; l: Array<[string, string]> }> = [
    { t: 'Producto', l: [['Funciones', '/funciones'], ['Precios', '/precios'], ['Iniciar sesión', '/login']] },
    { t: 'Empresa', l: [['Sobre VULO', '/empresa'], ['Contacto', '/contacto']] },
    {
      t: 'Contacto',
      l: [
        ['WhatsApp 317 103 5768', 'https://wa.me/523171035768'],
        ['hola@vulo.mx', 'mailto:hola@vulo.mx'],
        ['Autlán de Navarro, Jalisco', '/contacto'],
      ],
    },
    { t: 'Legal', l: [['Términos', '#'], ['Privacidad', '#']] },
  ];
  return (
    <footer className="border-t border-slate-100 bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <img src={wordmark} alt="VULO" className="h-5 w-auto object-contain" />
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
              Software para hoteles. Hecho en Autlán de Navarro, Jalisco.
            </p>
            <div className="mt-4 space-y-1.5 text-[13px] text-slate-600">
              <a href="https://wa.me/523171035768" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-slate-900">
                <Phone className="h-3.5 w-3.5" /> 317 103 5768
              </a>
              <div className="inline-flex items-center gap-2 text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> Autlán de Navarro, Jalisco
              </div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{c.t}</div>
              <ul className="space-y-2">
                {c.l.map(([label, href]) => {
                  const external = href.startsWith('http') || href.startsWith('mailto:');
                  return (
                    <li key={label}>
                      {external ? (
                        <a href={href} className="text-[13.5px] text-slate-600 hover:text-slate-900">{label}</a>
                      ) : (
                        <Link to={href} className="text-[13.5px] text-slate-600 hover:text-slate-900">{label}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 text-[12px] text-slate-400">
          <div>© {new Date().getFullYear()} VULO · Autlán de Navarro, Jalisco, México</div>
          <div className="inline-flex items-center gap-2">
            <span>Desarrollado por</span>
            <span className="font-semibold text-slate-700">Uniline</span>
            <span className="text-slate-400">· Innovación en la nube</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}