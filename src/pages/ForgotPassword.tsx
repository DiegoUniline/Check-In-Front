import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await api.requestPasswordReset(email);
      setSent(true);
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja para restablecer tu contraseña' });
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
          <CardTitle className="text-2xl font-bold">Recuperar contraseña</CardTitle>
          <CardDescription>Te enviaremos un enlace por correo</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Si <strong>{email}</strong> está registrado, recibirás un correo con instrucciones.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" />Volver al login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar enlace'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" />Volver al login</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
