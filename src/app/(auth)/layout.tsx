'use client';

import { LoginFooter } from './login/components/LoginFooter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
      <div className="mt-8 w-full max-w-sm">
        <LoginFooter />
      </div>
    </div>
  );
}
