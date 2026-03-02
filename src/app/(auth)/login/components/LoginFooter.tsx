
'use client';

import { useEffect, useState } from 'react';

export function LoginFooter() {
    // Iniciar con null en el servidor para evitar un desajuste de hidratación
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        // Este efecto se ejecuta solo en el cliente después de la hidratación, asegurando que el año sea correcto.
        setYear(new Date().getFullYear());
    }, []);

    return (
        <footer className="w-full text-center text-sm text-muted-foreground">
            © {year || new Date().getFullYear()} CrediNic. Todos los derechos reservados.
        </footer>
    );
}
