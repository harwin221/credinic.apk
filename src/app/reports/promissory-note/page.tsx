
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Printer, X } from 'lucide-react';
import type { ReceiptOutput } from '@/services/report-service';
import { generatePromissoryNotePdf } from '@/services/pdf/promissory-note-pdf';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function PromissoryNoteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const creditId = searchParams.get('creditId');

        const generatePdf = async () => {
            if (!creditId) {
                setError('No se especificó un ID de crédito.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const result = await generatePromissoryNotePdf(creditId);

                if (result.error) throw new Error(result.error);
                if (result.pdfDataUri) {
                    setPdfUrl(result.pdfDataUri);
                } else {
                    throw new Error("La acción del servidor no devolvió un PDF.");
                }

            } catch (error: any) {
                console.error("Error generating PDF:", error);
                setError(error.message || 'Ocurrió un error inesperado al generar el Pagaré.');
                toast({
                    title: "Error al generar Pagaré",
                    description: error.message || "Ocurrió un error inesperado.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        generatePdf();
    }, [searchParams, toast]);

    const handleClose = () => {
        // This will attempt to close the tab/window.
        // It only works if the window was opened by a script (which we are now ensuring).
        window.close();

        // As a fallback in case the browser blocks window.close(),
        // we can navigate the user away after a short delay.
        // This is a safety net.
        setTimeout(() => {
            router.push('/credits');
        }, 500);
    };


    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generando Pagaré... por favor, espera.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 sm:p-6 bg-gray-100 h-screen flex items-center justify-center">
                <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <h2 className="text-xl font-bold text-destructive mb-2">Error al Generar Documento</h2>
                            <p>{error}</p>
                            <Button onClick={handleClose} className="mt-4">Cerrar</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("bg-gray-500 print:bg-white w-full h-screen flex flex-col items-center", "report-portrait")}>
            <div className="w-full bg-white py-2 px-4 shadow-md no-print flex justify-between items-center">
                <h1 className="text-lg font-semibold">Pagaré</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose}><X className="mr-2 h-4 w-4" /> Cerrar</Button>
                </div>
            </div>
            <div className="flex-grow w-full p-4 overflow-y-auto">
                {pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full border-0 shadow-lg" title="Pagaré" />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p>No se pudo mostrar el PDF.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PromissoryNotePage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando pagaré...</p>
            </div>
        }>
            <PromissoryNoteContent />
        </React.Suspense>
    );
}
