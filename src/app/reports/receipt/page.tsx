
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateReceiptHtml } from '@/services/pdf/receipt-html';

function ReceiptContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [receiptHtml, setReceiptHtml] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const generateData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const creditId = searchParams.get('creditId');
                const paymentId = searchParams.get('paymentId');
                const isReprint = searchParams.get('isReprint') === 'true';

                if (!creditId || !paymentId) {
                    throw new Error('Faltan parámetros para generar el recibo.');
                }

                const result = await generateReceiptHtml({ creditId, paymentId, isReprint });

                if (result.error) throw new Error(result.error);

                if (result.html) {
                    setReceiptHtml(result.html);
                } else {
                    throw new Error("La acción del servidor no devolvió el HTML del recibo.");
                }
            } catch (e: any) {
                console.error("Error preparando los datos del recibo:", e);
                setError(e.message || 'No se pudo generar los datos del recibo.');
                toast({
                    title: "Error de Recibo",
                    description: e.message,
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        generateData();
    }, [searchParams, toast]);

    React.useEffect(() => {
        // Disparar automáticamente el diálogo de impresión cuando el HTML esté listo
        if (receiptHtml && !isLoading && !error) {
            // Un pequeño retraso puede ayudar a asegurar que todos los estilos se apliquen antes de imprimir
            setTimeout(() => {
                window.print();
            }, 100);
        }
    }, [receiptHtml, isLoading, error]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Generando recibo...</p>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-800 border border-red-400 rounded-md">Error: {error}</div>;
    }

    if (receiptHtml) {
        // Renderizar directamente la cadena HTML del servidor
        return <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />;
    }

    return <div className="p-4">No se pudo generar el recibo.</div>;
}

export default function ReceiptPage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando recibo...</p>
            </div>
        }>
            <ReceiptContent />
        </React.Suspense>
    );
}
