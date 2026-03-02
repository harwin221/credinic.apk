'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileQuestion, ArrowLeft } from 'lucide-react';
 
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl">Página No Encontrada</p>
        <a href="/" className="mt-4 inline-block rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
          Volver al Inicio
        </a>
      </div>
    </div>
  )
}
