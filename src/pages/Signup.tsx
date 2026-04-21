import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Hotel, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const schema = z.object({
  hotel_nombre: z.string().min(2, 'El nombre del hotel es requerido'),
  nombre: z.string().min(2, 'Tu nombre es requerido'),
  apellido_paterno: z.string().optional(),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const result = await api.signup({
        email: data.email,
        password: data.password,
        nombre: data.nombre,
        apellido_paterno: data.apellido_paterno,
        hotel_nombre: data.hotel_nombre,
      });
      if (result.needsConfirmation) {
        toast({ title: 'Revisa tu correo', description: 'Te enviamos un enlace para confirmar tu cuenta.' });
        navigate('/login');
      } else {
        await refreshUser();
        toast({ title: '¡Cuenta creada!', description: `Bienvenido a ${data.hotel_nombre}` });
        navigate('/dashboard');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo crear la cuenta' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
      <Card className="relative w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Hotel className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
          <CardDescription>Registra tu hotel en la plataforma</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre del hotel</Label>
              <Input placeholder="Hotel Vista Mar" {...register('hotel_nombre')} />
              {errors.hotel_nombre && <p className="text-xs text-destructive">{errors.hotel_nombre.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input placeholder="Juan" {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Apellido</Label>
                <Input placeholder="Pérez" {...register('apellido_paterno')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Correo</Label>
              <Input type="email" placeholder="tu@correo.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  {...register('password')}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear cuenta'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Inicia sesión</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
