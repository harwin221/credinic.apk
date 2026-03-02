
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className={cn(
        "flex items-center justify-start focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      )}
      aria-label="Página de inicio de CREDINIC"
    >
      <div style={{ width: '160px', height: '56px', position: 'relative' }}>
        <Image
          src="/CrediNica.png"
          alt="CREDINIC Logo"
          fill
          priority
        />
      </div>
      {
        !collapsed && (
          <span className="sr-only">CREDINIC</span>
        )
      }
    </Link >
  );
}
