
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createFirstUser } from '@/services/user-service-server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/AppLogo';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { CreateUserInput } from '@/lib/types';


export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const displayName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    
    if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
    }

    if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
    }

    try {
      const result = await createFirstUser({ displayName, email, password });
      if (result.success) {
        toast({
          title: '¡Usuario Administrador Creado!',
          description: 'Serás redirigido a la página de inicio de sesión.',
        });
        router.push('/login');
      } else {
        setError(result.error || 'Ocurrió un error inesperado.');
      }
    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  const arePasswordsMatching = password === confirmPassword && password !== '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center space-y-4">
                 <div className="mx-auto mb-4 flex justify-center">
                    <AppLogo />
                </div>
                <CardTitle>Configuración Inicial</CardTitle>
                <CardDescription>
                    Crea la primera cuenta de administrador para empezar a usar la aplicación.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre Completo</Label>
                        <Input id="fullName" name="fullName" placeholder="Ej: Administrador del Sistema" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico (Login)</Label>
                        <Input id="email" name="email" type="email" placeholder="admin@tuempresa.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="relative">
                            <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={() => setShowPassword(prev => !prev)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                         <div className="relative">
                            <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                    {error && <p className="text-sm font-medium text-destructive mb-4">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading || !arePasswordsMatching}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Administrador
                    </Button>
                </CardFooter>
            </form>
        </Card>
    </div>
  );
}
