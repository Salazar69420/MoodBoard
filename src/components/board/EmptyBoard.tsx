export function EmptyBoard() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <div className="text-center max-w-xs">
        {/* Dotted border frame with icon */}
        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#2a2a2a] flex items-center justify-center mx-auto mb-5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        <p className="text-[#4a4a4a] text-sm font-semibold mb-2 tracking-wide uppercase" style={{ letterSpacing: '0.08em', fontSize: 11 }}>
          No frames yet
        </p>
        <p className="text-[#3a3a3a] text-[13px] mb-4 leading-relaxed">
          Paste images from Hexfield or drop files to add generation frames
        </p>

        <div className="flex flex-col gap-1.5 text-[11px] text-[#333]">
          <div className="flex items-center gap-2 justify-center">
            <kbd className="bg-[#1e1e1e] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono text-[10px] text-[#555]">Ctrl+V</kbd>
            <span>Paste from clipboard</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-[#2a2a2a]">or drag &amp; drop image files</span>
          </div>
        </div>
      </div>
    </div>
  );
}
