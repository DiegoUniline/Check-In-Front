import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Hotel, BedDouble, Calendar, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Nav */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Hotel className="h-6 w-6 text-primary" />
            HospedApp
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Crear mi hotel</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 lg:py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          Sistema completo para tu hotel
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Administra tu hotel <span className="text-primary">sin complicaciones</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Reservas, recepción, limpieza, inventario, reportes y página de reservas online para tus huéspedes. Todo en un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/signup">
              Comenzar gratis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Probar demo</Link>
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20 text-left">
          {[
            { icon: Calendar, title: 'Reservas en tiempo real', desc: 'Tus huéspedes reservan desde tu web y aparecen al instante en el sistema.' },
            { icon: BedDouble, title: 'Control de habitaciones', desc: 'Estado de cada habitación: limpieza, mantenimiento y ocupación al día.' },
            { icon: Hotel, title: 'Recepción completa', desc: 'Check-in, check-out, cargos, pagos y POS integrados.' },
            { icon: ShieldCheck, title: 'Multi-hotel y seguro', desc: 'Datos protegidos por hotel con roles y permisos granulares.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-6">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t mt-10">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} HospedApp · Sistema de gestión hotelera
        </div>
      </footer>
    </div>
  );
}