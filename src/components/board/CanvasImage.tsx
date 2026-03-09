import { useRef, useCallback, memo, useState, useEffect } from 'react';
import type { BoardImage } from '../../types';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { useImageStore } from '../../stores/useImageStore';
import { useUIStore } from '../../stores/useUIStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { ResizeHandle } from './ResizeHandle';
import { PromptGenerator } from './PromptGenerator';
import { EditPromptGenerator } from './EditPromptGenerator';

interface CanvasImageProps {
  image: BoardImage;
  zoomScale: number;
}

const DISPLAY_MAX_WIDTH = 350;
const DRAG_THRESHOLD = 5;

export const CanvasImage = memo(function CanvasImage({ image, zoomScale }: CanvasImageProps) {
  const blobUrl = useBlobUrl(image.blobId);
  const selectedImageIds = useUIStore((s) => s.selectedImageIds);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const isSelected = selectedImageIds.has(image.id);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const connectingFromId = useBoardStore((s) => s.connectingFromId);
  const boardMode = useBoardStore((s) => s.boardMode);
  const isConnectingFrom = connectingFromId === image.id;

  const connections = useBoardStore((s) => s.connections);
  const allImages = useImageStore((s) => s.images);
  const connectedImages = allImages.filter(img =>
    connections.some(c =>
      (c.fromId === image.id && c.toId === img.id) ||
      (c.toId === image.id && c.fromId === img.id)
    )
  );
  // Category note completeness
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
  const imageEditNotes = editNotes.filter(n => n.imageId === image.id);
  const filledCats = new Set(imageNotes.map(n => n.categoryId));
  const filledEditCats = new Set(imageEditNotes.map(n => n.categoryId));
  const totalFilled = filledCats.size;
  const totalEditFilled = filledEditCats.size;
  const totalCategories = SHOT_CATEGORIES.length;
  const totalEditCategories = EDIT_CATEGORIES.length;

  // Image load animation state
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [showCopyFlash, setShowCopyFlash] = useState(false);
  const [showCopiedLabel, setShowCopiedLabel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Handle hover state for connection anchors
  const [hoverHandle, setHoverHandle] = useState<'input' | 'output' | null>(null);

  // Trigger scan animation once blob is available
  useEffect(() => {
    if (blobUrl && !imgLoaded) {
      // scan runs for 0.65s then shows image
      const t = setTimeout(() => setScanDone(true), 680);
      return () => clearTimeout(t);
    }
  }, [blobUrl]);

  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startImgX: number;
    startImgY: number;
    hasMoved: boolean;
  } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (activeTool === 'connect') {
      const boardState = useBoardStore.getState();
      if (!boardState.connectingFromId) {
        boardState.startConnection(image.id);
      } else if (boardState.connectingFromId !== image.id) {
        boardState.finishConnection(currentProjectId!, image.id);
        setActiveTool('select');
      }
      return;
    }

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startImgX: image.x,
      startImgY: image.y,
      hasMoved: false,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;

      if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      drag.hasMoved = true;

      const newX = drag.startImgX + dx / zoomScale;
      const newY = drag.startImgY + dy / zoomScale;

      useImageStore.getState().updatePosition(image.id, newX, newY);
    };

    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (drag?.hasMoved) {
        useImageStore.getState().persistPosition(image.id);
      } else {
        useUIStore.getState().selectImage(image.id, e.ctrlKey || e.metaKey);
      }
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [image.id, image.x, image.y, zoomScale, activeTool, currentProjectId, setActiveTool]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useUIStore.getState().showContextMenu(e.clientX, e.clientY, image.id);
  }, [image.id]);

  // Calculate display dimensions
  const displayW = image.displayWidth || Math.min(image.width, DISPLAY_MAX_WIDTH);
  const displayH = image.displayHeight || (image.height > 0 ? (displayW / image.width) * image.height : displayW * 0.75);

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startW = displayW;
    const startH = displayH;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      const newW = Math.max(80, corner.includes('e') ? startW + dx / zoomScale : startW - dx / zoomScale);
      const newH = Math.max(60, corner.includes('s') ? startH + dy / zoomScale : startH - dy / zoomScale);
      useImageStore.getState().updateSize(image.id, newW, newH);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [displayW, displayH, zoomScale, image.id]);

  // Handle drag from OUTPUT handle (right side) to start a connection
  const handleOutputHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const boardState = useBoardStore.getState();
    boardState.startConnection(image.id);
    setActiveTool('connect');
  }, [image.id, setActiveTool]);

  // Drop onto INPUT handle (left side) to finish connection
  const handleInputHandleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const boardState = useBoardStore.getState();
    if (boardState.connectingFromId && boardState.connectingFromId !== image.id) {
      boardState.finishConnection(currentProjectId!, image.id);
      setActiveTool('select');
    }
  }, [image.id, currentProjectId, setActiveTool]);

  const isConnectMode = activeTool === 'connect';
  const isPendingTarget = isConnectMode && connectingFromId && connectingFromId !== image.id;

  // Handle anchors visible when: hovered OR in connect mode
  const showHandles = isHovered || isConnectMode;

  if (!blobUrl) {
    // Show skeleton while blob URL loading
    return (
      <div
        className="absolute rounded-lg overflow-hidden border border-[#2a2a2a]"
        style={{
          left: image.x,
          top: image.y,
          width: displayW,
          height: displayH,
          background: '#111',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '40%',
          top: '-40%',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 50%, transparent)',
          animation: 'scanSweep 1.2s ease-in-out infinite',
        }} />
      </div>
    );
  }

  return (
    <div
      className={`absolute group select-none`}
      style={{
        left: image.x,
        top: image.y,
        width: displayW,
        cursor: activeTool === 'connect' ? 'crosshair' : 'grab',
        transition: 'box-shadow 0.15s ease',
        zIndex: isSelected ? 15 : 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
    >
      {/* Main image card */}
      <div
        style={{
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          border: isSelected
            ? '1.5px solid #f97316'
            : isHovered
              ? '1px solid #444'
              : '1px solid #2a2a2a',
          boxShadow: isSelected
            ? '0 0 18px rgba(249,115,22,0.35), 0 4px 20px rgba(0,0,0,0.4)'
            : isHovered
              ? '0 0 12px rgba(249,115,22,0.18), 0 4px 16px rgba(0,0,0,0.3)'
              : '0 4px 12px rgba(0,0,0,0.35)',
          transition: 'border 0.15s ease, box-shadow 0.15s ease',
          ...(showCopyFlash ? { animation: 'copyFlash 0.4s ease-out' } : {}),
        }}
        className={isPendingTarget ? 'ring-2 ring-[#f97316]/60' : ''}
      >
        {/* Scan-line overlay (while loading) */}
        {!scanDone && (
          <>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#0f0f0f',
              zIndex: 2,
            }} />
            <div
              className="image-loading-scan"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '35%',
                top: '-35%',
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.07) 55%, transparent)',
                zIndex: 3,
              }}
            />
          </>
        )}

        {/* The actual image */}
        <img
          src={blobUrl}
          alt={image.label || image.filename}
          className="w-full h-auto block"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          style={{
            opacity: scanDone ? 1 : 0,
            transform: scanDone ? 'scale(1)' : 'scale(0.92)',
            transition: scanDone
              ? 'opacity 0.3s ease-out, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
        />

        {/* Hover overlay with copy button */}
        {!isConnectMode && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isHovered ? 'rgba(0,0,0,0.18)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const { copyImageToClipboard } = await import('../../utils/clipboard');
                const success = await copyImageToClipboard(image.blobId);
                if (success) {
                  setShowCopyFlash(true);
                  setShowCopiedLabel(true);
                  setTimeout(() => setShowCopyFlash(false), 450);
                  setTimeout(() => setShowCopiedLabel(false), 1100);
                }
                useUIStore.getState().showToast(success ? 'Copied to clipboard' : 'Failed to copy');
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: isHovered ? 1 : 0,
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid #3a3a3a',
                color: '#e5e5e5',
                borderRadius: 6,
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease, background 0.15s ease',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.9)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
              title="Copy to clipboard"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        )}

        {/* Connect mode overlay */}
        {isConnectMode && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isConnectingFrom && (
              <div style={{
                background: 'rgba(249,115,22,0.85)',
                color: 'white',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                pointerEvents: 'none',
              }}>
                Connecting…
              </div>
            )}
            {isPendingTarget && (
              <div style={{
                opacity: isHovered ? 1 : 0,
                background: 'rgba(249,115,22,0.8)',
                color: 'white',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                pointerEvents: 'none',
                transition: 'opacity 0.15s ease',
              }}>
                Connect here
              </div>
            )}
          </div>
        )}

        {/* Image label */}
        {(image.label || isHovered) && !isConnectMode && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            padding: '12px 8px 6px',
            display: 'flex',
          }}>
            <input
              value={image.label || ''}
              placeholder="Add label (@name)..."
              onChange={(e) => useImageStore.getState().updateLabel(image.id, e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Escape' || e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e5e5e5',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                width: '100%',
                outline: 'none',
                textOverflow: 'ellipsis',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Completeness Indicator (top-right corner of image) ── */}
      {(totalFilled > 0 || totalEditFilled > 0 || isHovered) && (
        <div
          style={{
            position: 'absolute',
            top: -22,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {/* I2V dots */}
          {boardMode === 'i2v' && SHOT_CATEGORIES.map(cat => {
            const filled = filledCats.has(cat.id);
            return (
              <div
                key={cat.id}
                title={`${cat.icon} ${cat.label}: ${filled ? 'noted' : 'missing'}`}
                style={{
                  width: filled ? 8 : 6,
                  height: filled ? 8 : 6,
                  borderRadius: '50%',
                  background: filled ? cat.color : 'transparent',
                  border: `1.5px solid ${filled ? cat.color : '#333'}`,
                  boxShadow: filled ? `0 0 5px ${cat.color}80` : 'none',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              />
            );
          })}
          {/* Count badge */}
          {boardMode === 'i2v' && (
            <div style={{
              marginLeft: 3,
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: totalFilled === totalCategories ? '#4ade80' : '#666',
              letterSpacing: '0.04em',
              transition: 'color 0.2s ease',
            }}>
              {totalFilled}/{totalCategories}
            </div>
          )}

          {/* Edit notes indicator */}
          {boardMode === 'edit' && totalEditFilled > 0 && (
            <>
              <div style={{
                fontSize: 8,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#22d3ee',
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.2)',
                borderRadius: 3,
                padding: '0px 3px',
                fontWeight: 600,
              }}>
                ✏️{totalEditFilled}/{totalEditCategories}
              </div>
            </>
          )}
        </div>
      )}

      {/* "Copied!" floating label */}
      {showCopiedLabel && (
        <div className="copied-label">copied</div>
      )}

      {/* ============ ANCHOR HANDLES ============ */}

      {/* INPUT handle — LEFT center edge */}
      {showHandles && (
        <div
          onMouseUp={handleInputHandleMouseUp}
          onMouseEnter={() => setHoverHandle('input')}
          onMouseLeave={() => setHoverHandle(null)}
          style={{
            position: 'absolute',
            top: '50%',
            left: -6,
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: hoverHandle === 'input' || isPendingTarget ? '#f97316' : '#444',
            border: `2px solid ${hoverHandle === 'input' || isPendingTarget ? '#f97316' : '#666'}`,
            boxShadow: hoverHandle === 'input' || isPendingTarget
              ? '0 0 12px rgba(249,115,22,0.7)'
              : '0 0 4px rgba(0,0,0,0.5)',
            cursor: 'crosshair',
            zIndex: 20,
            transition: 'background 0.12s ease, box-shadow 0.12s ease',
          }}
        />
      )}

      {/* OUTPUT handle — RIGHT center edge */}
      {showHandles && (
        <div
          onMouseDown={handleOutputHandleMouseDown}
          onMouseEnter={() => setHoverHandle('output')}
          onMouseLeave={() => setHoverHandle(null)}
          style={{
            position: 'absolute',
            top: '50%',
            right: -6,
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: hoverHandle === 'output' || isConnectingFrom ? '#f97316' : '#444',
            border: `2px solid ${hoverHandle === 'output' || isConnectingFrom ? '#f97316' : '#666'}`,
            boxShadow: hoverHandle === 'output' || isConnectingFrom
              ? '0 0 12px rgba(249,115,22,0.7)'
              : '0 0 4px rgba(0,0,0,0.5)',
            cursor: 'crosshair',
            zIndex: 20,
            transition: 'background 0.12s ease, box-shadow 0.12s ease',
          }}
        />
      )}

      {/* "+" add node button — bottom-right corner */}
      {isHovered && !isConnectMode && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            // Start connection from this node — user can connect to existing or we could open node picker
            handleOutputHandleMouseDown(e as unknown as React.MouseEvent);
          }}
          style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '1.5px solid #3a3a3a',
            color: '#aaa',
            fontSize: 14,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 25,
            boxShadow: '0 0 8px rgba(0,0,0,0.6)',
            lineHeight: 1,
            transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = '#2a2a2a';
            el.style.borderColor = '#f97316';
            el.style.color = '#f97316';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = '#1a1a1a';
            el.style.borderColor = '#3a3a3a';
            el.style.color = '#aaa';
          }}
          title="Start connection"
        >
          +
        </button>
      )}

      {/* Resize handles */}
      {isSelected && !isConnectMode && (
        <>
          <ResizeHandle corner="nw" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="ne" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="sw" onResizeStart={handleResizeStart} />
          <ResizeHandle corner="se" onResizeStart={handleResizeStart} />
        </>
      )}

      {/* Process Prompt button — below image (I2V) */}
      {imageNotes.length > 0 && !isConnectMode && boardMode === 'i2v' && (
        <PromptGenerator image={image} notes={imageNotes} connectedImages={[]} />
      )}

      {/* Process Edit Prompt button — below I2V prompt */}
      {imageEditNotes.length > 0 && !isConnectMode && boardMode === 'edit' && (
        <EditPromptGenerator image={image} notes={imageEditNotes} connectedImages={connectedImages} />
      )}
    </div>
  );
});
