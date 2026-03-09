import { useUIStore } from '../../stores/useUIStore';

export function Toast() {
  const message = useUIStore((s) => s.toastMessage);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-[fadeInUp_0.2s_ease-out]">
      <div className="bg-[#2a2a2a] border border-[#444] text-[#e5e5e5] px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium">
        {message}
      </div>
    </div>
  );
}
