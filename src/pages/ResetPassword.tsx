import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase auto-procesa el hash y emite PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidSession(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Contraseña muy corta', description: 'Mínimo 8 caracteres' });
      return;
    }
    if (password !== confirm) {
      toast({ variant: 'destructive', title: 'No coinciden', description: 'Las contraseñas no son iguales' });
      return;
    }
    setSubmitting(true);
    try {
      await api.updatePassword(password);
      toast({ title: 'Contraseña actualizada', description: 'Ya puedes iniciar sesión con tu nueva contraseña' });
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="relative w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Hotel className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
          <CardDescription>Define tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {!validSession ? (
            <p className="text-sm text-center text-muted-foreground py-6">
              Verificando enlace... Si no funciona, solicita uno nuevo desde "Olvidé mi contraseña".
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Actualizar contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
