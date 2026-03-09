import { useRef, useState, useCallback, useEffect } from 'react';
import type { TextNode } from '../../types';

interface Props {
    node: TextNode;
    onUpdate: (id: string, updates: Partial<TextNode>) => void;
    onDelete: (id: string) => void;
    zoomScale?: number;
    autoFocus?: boolean;
    onFocused?: () => void;
}

const DRAG_THRESHOLD = 4;

export function TextNodeComponent({ node, onUpdate, onDelete, zoomScale = 1, autoFocus, onFocused }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [localText, setLocalText] = useState(node.text);

    useEffect(() => {
        if (!isEditing) setLocalText(node.text);
    }, [node.text, isEditing]);

    const dragRef = useRef<{
        startX: number;
        startY: number;
        startNodeX: number;
        startNodeY: number;
        hasMoved: boolean;
    } | null>(null);

    // Trigger appear animation on mount
    useEffect(() => {
        const t = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startNodeX: node.x,
            startNodeY: node.y,
            hasMoved: false,
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const dx = moveEvent.clientX - drag.startX;
            const dy = moveEvent.clientY - drag.startY;

            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;

            onUpdate(node.id, {
                x: drag.startNodeX + dx / zoomScale,
                y: drag.startNodeY + dy / zoomScale,
            });
        };

        const handleMouseUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [node.id, node.x, node.y, zoomScale, onUpdate]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
            if (onFocused) onFocused();
        }
    }, [autoFocus, onFocused]);

    const borderColor = isEditing
        ? '#f97316'
        : isHovered
            ? 'rgba(249,115,22,0.4)'
            : '#2a2a2a';

    const boxShadow = isEditing
        ? '0 0 18px rgba(249,115,22,0.3), 0 4px 20px rgba(0,0,0,0.5)'
        : isHovered
            ? '0 0 12px rgba(249,115,22,0.18), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 12px rgba(0,0,0,0.4)';

    return (
        <div
            className="absolute select-none"
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                minHeight: node.height,
                zIndex: isEditing ? 20 : 10,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'scale(1)' : 'scale(0.88)',
                transition: 'opacity 250ms ease-out, transform 250ms ease-out',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(node.id); }}
        >
            <div
                style={{
                    position: 'relative',
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                    background: '#141414',
                    boxShadow,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    overflow: 'hidden',
                }}
            >
                {/* Top bar / drag handle */}
                <div
                    style={{
                        width: '100%',
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        background: isEditing
                            ? 'rgba(249,115,22,0.08)'
                            : 'rgba(255,255,255,0.03)',
                        borderBottom: `1px solid ${isEditing ? 'rgba(249,115,22,0.15)' : '#1e1e1e'}`,
                        cursor: 'move',
                        transition: 'background 0.15s ease',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Drag dots */}
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    background: isEditing ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.15)',
                                    transition: 'background 0.15s ease',
                                }}
                            />
                        ))}
                    </div>

                    {/* Node type label */}
                    <span style={{
                        fontSize: 9,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isEditing ? '#f97316' : '#555',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        transition: 'color 0.15s ease',
                    }}>
                        note
                    </span>

                    {/* Delete button */}
                    <button
                        style={{
                            opacity: isHovered ? 1 : 0,
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                            borderRadius: 3,
                            transition: 'opacity 0.15s ease, color 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(node.id);
                        }}
                        title="Delete note"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 400,
                        letterSpacing: '0.01em',
                        padding: '10px 12px',
                        fontSize: node.fontSize,
                        color: node.color,
                        height: Math.max(node.height - 24, 60),
                        cursor: isEditing ? 'text' : 'inherit',
                        lineHeight: '1.55',
                        caretColor: '#f97316',
                        border: 'none',
                        overflowY: 'auto',
                    }}
                    value={localText}
                    placeholder="Type your note…"
                    onFocus={() => setIsEditing(true)}
                    onBlur={() => { setIsEditing(false); onUpdate(node.id, { text: localText }); }}
                    onChange={(e) => {
                        setLocalText(e.target.value);
                        onUpdate(node.id, { text: e.target.value });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                    }}
                />

                {/* Active orange accent line at bottom */}
                <div style={{
                    height: 2,
                    background: isEditing
                        ? 'linear-gradient(to right, transparent, #f97316, transparent)'
                        : 'transparent',
                    transition: 'background 0.2s ease',
                }} />

                {/* Resize handle */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 16,
                        height: 16,
                        cursor: 'se-resize',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '3px',
                        opacity: isHovered ? 0.6 : 0,
                        transition: 'opacity 0.15s ease',
                        zIndex: 10,
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startW = node.width;
                        const startH = node.height;
                        const onMove = (mv: MouseEvent) => {
                            const dx = mv.clientX - startX;
                            const dy = mv.clientY - startY;
                            onUpdate(node.id, {
                                width: Math.max(120, startW + dx / zoomScale),
                                height: Math.max(80, startH + dy / zoomScale),
                            });
                        };
                        const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 8 L8 2M5 8 L8 5" stroke="rgba(249,115,22,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );
}
