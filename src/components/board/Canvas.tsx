import { useRef, useState, useCallback, useEffect } from 'react';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';
import { useFileDrop } from '../../hooks/useFileDrop';
import { CanvasImage } from './CanvasImage';
import { EmptyBoard } from './EmptyBoard';
import { useBoardStore } from '../../stores/useBoardStore';
import { ConnectionLayer } from './ConnectionLayer';
import { TextNodeComponent } from './TextNodeComponent';
import { CategoryNoteNode } from './CategoryNoteNode';
import { EditNoteNode } from './EditNoteNode';
import { PromptNodeComponent } from './PromptNodeComponent';
import { useProjectStore } from '../../stores/useProjectStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_SPEED = 0.001;

export function Canvas() {
  const images = useImageStore((s) => s.images);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const { activeTool, setActiveTool } = useUIStore();
  const connections = useBoardStore((s) => s.connections);
  const textNodes = useBoardStore((s) => s.textNodes);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const promptNodes = useBoardStore((s) => s.promptNodes);
  const connectingFromId = useBoardStore((s) => s.connectingFromId);
  const removeConnection = useBoardStore((s) => s.removeConnection);
  const updateConnectionLabel = useBoardStore((s) => s.updateConnectionLabel);
  const updateTextNode = useBoardStore((s) => s.updateTextNode);
  const removeTextNode = useBoardStore((s) => s.removeTextNode);
  const addTextNode = useBoardStore((s) => s.addTextNode);
  const cancelConnection = useBoardStore((s) => s.cancelConnection);
  const boardMode = useBoardStore((s) => s.boardMode);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newNodeId, setNewNodeId] = useState<string | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const spacePressed = useRef(false);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);

  useFileDrop(containerRef);

  // Space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          spacePressed.current = true;
          if (containerRef.current) containerRef.current.style.cursor = 'grab';
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false;
        if (containerRef.current && !isPanning.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SPEED;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + delta)));
    const ratio = newZoom / zoom;

    setPanX((prev) => mouseX - ratio * (mouseX - prev));
    setPanY((prev) => mouseY - ratio * (mouseY - prev));
    setZoom(newZoom);
  }, [zoom]);

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spacePressed.current)) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isPanning.current) return;
        const dx = moveEvent.clientX - panStart.current.x;
        const dy = moveEvent.clientY - panStart.current.y;
        setPanX(panStart.current.panX + dx);
        setPanY(panStart.current.panY + dy);
      };

      const handleMouseUp = () => {
        isPanning.current = false;
        if (containerRef.current) {
          containerRef.current.style.cursor = spacePressed.current ? 'grab' : 'default';
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else if (e.button === 0) {
      if (activeTool === 'text' && currentProjectId) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const realX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
          const realY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
          const id = await addTextNode(currentProjectId, realX, realY);
          setNewNodeId(id);
          setActiveTool('select');
        }
      } else if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasWrapper) {
        if (activeTool === 'connect') {
          cancelConnection();
          setActiveTool('select');
        } else {
          clearSelection();
          hideContextMenu();
        }
      }
    }
  }, [panX, panY, zoom, activeTool, currentProjectId, addTextNode, setActiveTool, cancelConnection, clearSelection, hideContextMenu]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden canvas-bg"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      {/* Transform wrapper */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const canvasX = (e.clientX - rect.left - panXRef.current) / zoomRef.current;
          const canvasY = (e.clientY - rect.top - panYRef.current) / zoomRef.current;
          setMousePos({ x: canvasX, y: canvasY });
        }}
        data-canvas-wrapper="true"
      >
        <ConnectionLayer
          connections={connections}
          images={images}
          pendingFromId={connectingFromId}
          mousePos={mousePos}
          onDelete={removeConnection}
          onUpdateLabel={updateConnectionLabel}
        />

        {/* ── Category note tether lines ── */}
        <svg style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'visible', zIndex: 4,
        }}>
          {boardMode === 'i2v' && categoryNotes.map(note => {
            const img = images.find(i => i.id === note.imageId);
            if (!img) return null;
            const cat = SHOT_CATEGORIES.find(c => c.id === note.categoryId);
            if (!cat) return null;
            const displayW = img.displayWidth ?? Math.min(img.width, 350);
            const displayH = img.displayHeight ?? (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
            // From right-center of image to left-center of note
            const fx = img.x + displayW;
            const fy = img.y + displayH / 2;
            const tx = note.x;
            const ty = note.y + 20; // header center
            const cp = Math.max(40, Math.abs(tx - fx) * 0.4);
            return (
              <path
                key={note.id}
                d={`M ${fx},${fy} C ${fx + cp},${fy} ${tx - cp},${ty} ${tx},${ty}`}
                fill="none"
                stroke={cat.color}
                strokeWidth={1.2}
                strokeOpacity={0.4}
                strokeDasharray="5 4"
              />
            );
          })}
          {/* ── Edit note tether lines ── */}
          {boardMode === 'edit' && editNotes.map(note => {
            const img = images.find(i => i.id === note.imageId);
            if (!img) return null;
            const cat = EDIT_CATEGORIES.find(c => c.id === note.categoryId);
            if (!cat) return null;
            const displayW = img.displayWidth ?? Math.min(img.width, 350);
            const displayH = img.displayHeight ?? (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
            const fx = img.x + displayW;
            const fy = img.y + displayH / 2;
            const tx = note.x;
            const ty = note.y + 20;
            const cp = Math.max(40, Math.abs(tx - fx) * 0.4);
            return (
              <path
                key={`edit-${note.id}`}
                d={`M ${fx},${fy} C ${fx + cp},${fy} ${tx - cp},${ty} ${tx},${ty}`}
                fill="none"
                stroke={cat.color}
                strokeWidth={1.2}
                strokeOpacity={0.35}
                strokeDasharray="3 5"
              />
            );
          })}
        </svg>

        {textNodes.map((node) => (
          <TextNodeComponent
            key={node.id}
            node={node}
            onUpdate={updateTextNode}
            onDelete={removeTextNode}
            zoomScale={zoom}
            autoFocus={node.id === newNodeId}
            onFocused={() => setNewNodeId(null)}
          />
        ))}
        {categoryNotes.map((note) => (
          <CategoryNoteNode
            key={note.id}
            note={note}
            zoomScale={zoom}
          />
        ))}
        {editNotes.map((note) => (
          <EditNoteNode
            key={note.id}
            note={note}
            zoomScale={zoom}
          />
        ))}
        {promptNodes.map((node) => (
          <PromptNodeComponent
            key={node.id}
            node={node}
            zoomScale={zoom}
          />
        ))}
        {images.map((image) => (
          <CanvasImage key={image.id} image={image} zoomScale={zoom} />
        ))}
      </div>

      {images.length === 0 && <EmptyBoard />}

      {/* Zoom indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(8,9,16,0.82)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 11,
          color: '#484d60',
          fontFamily: "'JetBrains Mono', monospace",
          userSelect: 'none',
          backdropFilter: 'blur(16px) saturate(180%)',
          letterSpacing: '0.04em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {zoomPercent}%
      </div>

      {/* Connecting status banner */}
      {connectingFromId && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,16,0.88)',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: 12,
          padding: '8px 18px',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#f97316',
          userSelect: 'none',
          backdropFilter: 'blur(24px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(249,115,22,0.08)',
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#f97316',
            boxShadow: '0 0 8px rgba(249,115,22,0.8)',
            animation: 'pulse 1.5s ease-in-out infinite',
            display: 'inline-block',
          }} />
          Hover a node's left handle to connect · Esc to cancel
          <button
            onClick={() => { cancelConnection(); setActiveTool('select'); }}
            style={{
              marginLeft: 6,
              color: '#f97316',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              opacity: 0.7,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
          >
            ✕
          </button>
        </div>
      )}

      {/* Text tool hint */}
      {activeTool === 'text' && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,16,0.88)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '8px 18px',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#8891aa',
          userSelect: 'none',
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          Click anywhere on the canvas to place a text note
        </div>
      )}

      {/* Futuristic Liquid Glass Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(8,9,16,0.82)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <ToolButton
          label="Select"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => { setActiveTool('select'); cancelConnection(); }}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 0l16 12-7 2-4 8L4 0z" />
            </svg>
          }
        />
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', margin: '0 1px' }} />
        <ToolButton
          label="Connect"
          shortcut="C"
          active={activeTool === 'connect'}
          onClick={() => setActiveTool('connect')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="7" cy="12" r="3" />
              <circle cx="17" cy="12" r="3" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          }
        />
        <ToolButton
          label="Text"
          shortcut="T"
          active={activeTool === 'text'}
          onClick={() => setActiveTool('text')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h10M4 18h6" />
            </svg>
          }
        />
      </div>

      {/* Drop zone overlay */}
      <DropOverlay containerRef={containerRef} />
    </div>
  );
}

function DropOverlay({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      setIsDragOver(false);
    };
    const handleDrop = () => setIsDragOver(false);

    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, [containerRef]);

  if (!isDragOver) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(249,115,22,0.05)',
      border: '2px dashed rgba(249,115,22,0.4)',
      borderRadius: 12,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 12,
        padding: '16px 28px',
        textAlign: 'center',
        boxShadow: '0 0 32px rgba(249,115,22,0.1)',
      }}>
        <p style={{
          color: '#f97316',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        }}>
          Drop images to add
        </p>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ToolButton({ label, shortcut, active, onClick, icon }: ToolButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: active
          ? 'rgba(249,115,22,0.15)'
          : hovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
        color: active ? '#f97316' : hovered ? '#d0d0d0' : '#666',
        boxShadow: active
          ? '0 0 14px rgba(249,115,22,0.18), inset 0 0 0 1px rgba(249,115,22,0.22)'
          : 'none',
      }}
    >
      <span style={{ color: active ? '#f97316' : hovered ? '#aaa' : '#666', lineHeight: 0 }}>
        {icon}
      </span>
      <span>{label}</span>
      <kbd style={{
        fontSize: 9,
        padding: '1px 5px',
        borderRadius: 3,
        fontFamily: "'JetBrains Mono', monospace",
        border: `1px solid ${active ? 'rgba(249,115,22,0.28)' : 'rgba(255,255,255,0.07)'}`,
        background: active ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)',
        color: active ? '#f97316' : '#444',
      }}>
        {shortcut}
      </kbd>
    </button>
  );
}
