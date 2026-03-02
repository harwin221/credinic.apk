import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AppClientLayout } from '@/components/AppClientLayout';
import React from 'react';

const fontInter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const APP_NAME = "CrediNic";
const APP_DESCRIPTION = "Gestión de Créditos y Cobranza";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: 'CREDINIC - Sistema de Gestión',
  description: 'Sistema integral de gestión de microfinanzas y cobranza optimizado para dispositivos móviles y escritorio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
    startupImage: "/CrediNica-inicial.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/CrediNica.png',
    apple: '/CrediNica.png',
  },
  keywords: ["créditos", "cobranza", "microfinanzas", "nicaragua", "gestión financiera", "pwa", "app"],
  authors: [{ name: "CrediNic Team" }],
  creator: "CrediNic",
  publisher: "CrediNic",
  robots: "noindex, nofollow", // Para producción cambiar a "index, follow"
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#1f2937",
    "msapplication-config": "none"
  }
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

/**
 * Este es el ROOT layout. Es un COMPONENTE DE SERVIDOR.
 * Su única responsabilidad es definir la estructura base y renderizar el AppClientLayout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("font-sans antialiased", fontInter.variable)}>
        {/* AppClientLayout ahora envuelve UserProvider internamente */}
        <AppClientLayout>{children}</AppClientLayout>
        <Toaster />
      </body>
    </html>
  );
}
