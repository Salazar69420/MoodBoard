import type { ReactNode } from 'react';
import { Toast } from './shared/Toast';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col overflow-hidden">
      {children}
      <Toast />
    </div>
  );
}
