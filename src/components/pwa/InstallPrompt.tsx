import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'vulo:pwa-install-dismissed';

export function InstallPrompt() {
  const [event, setEvent] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Hide inside iframe previews or if already installed / already dismissed recently
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.self !== window.top) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex gap-3">
      <div className="p-2 rounded-lg bg-orange-50 shrink-0">
        <Smartphone className="h-6 w-6 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Instalar VULO</p>
        <p className="text-xs text-muted-foreground">
          Añádelo a tu inicio y úsalo como app.
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={install}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Instalar
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>Ahora no</Button>
        </div>
      </div>
      <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
