import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { toast } from 'sonner';

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (pass.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres');
    if (pass !== confirm) return toast.error('Las contraseñas no coinciden');
    if (localStorage.getItem('demoMode') === 'true') return toast.error('La cuenta demo no puede cambiar contraseña');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setSaving(false);
    if (error) return toast.error(error.message || 'No se pudo cambiar la contraseña');
    toast.success('Contraseña actualizada');
    setPass(''); setConfirm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
          <DialogDescription>{user?.nombre} {user?.apellidoPaterno} · {user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Rol: <span className="text-foreground">{user?.rol}</span></p>
          <p>Hotel: <span className="text-foreground">{user?.hotelNombre}</span></p>
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Cambiar contraseña</p>
          <div className="space-y-1.5">
            <Label htmlFor="np">Nueva contraseña</Label>
            <Input id="np" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp">Confirmar contraseña</Label>
            <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <Button className="w-full" onClick={guardar} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
