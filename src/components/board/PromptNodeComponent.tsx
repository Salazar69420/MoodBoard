import { useRef, useState, useCallback, useEffect } from 'react';
import type { PromptNode } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';

interface Props {
    node: PromptNode;
    zoomScale?: number;
}

const DRAG_THRESHOLD = 4;

const TYPE_CONFIG = {
    i2v: { label: 'I2V PROMPT', color: '#f97316', bg: '#1c1008', border: '#4a2c10', glow: 'rgba(249,115,22,' },
    edit: { label: 'EDIT PROMPT', color: '#22d3ee', bg: '#071a1e', border: '#0f3d47', glow: 'rgba(34,211,238,' },
};

export function PromptNodeComponent({ node, zoomScale = 1 }: Props) {
    const updatePromptNode = useBoardStore((s) => s.updatePromptNode);
    const removePromptNode = useBoardStore((s) => s.removePromptNode);

    const cfg = TYPE_CONFIG[node.promptType];

    const [isHovered, setIsHovered] = useState(false);
    const [isMinimized, setIsMinimized] = useState(node.isMinimized);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const dragRef = useRef<{
        startX: number; startY: number;
        startNodeX: number; startNodeY: number;
        hasMoved: boolean;
    } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if ((e.target as HTMLElement).closest('[data-scrollable]')) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX, startY: e.clientY,
            startNodeX: node.x, startNodeY: node.y,
            hasMoved: false,
        };

        const handleMouseMove = (mv: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const dx = mv.clientX - drag.startX;
            const dy = mv.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;
            updatePromptNode(node.id, {
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
    }, [node.id, node.x, node.y, zoomScale, updatePromptNode]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updatePromptNode(node.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 350);
    }, [isMinimized, node.id, updatePromptNode]);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(node.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    }, [node.text]);

    const createdTime = new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div
            className="absolute select-none"
            style={{
                left: node.x,
                top: node.y,
                width: isMinimized ? 'auto' : node.width,
                zIndex: isHovered ? 40 : isMinimized ? 10 : 22,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out, width 350ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    borderRadius: isMinimized ? 8 : 10,
                    border: `1px solid ${isHovered ? cfg.color : cfg.border}`,
                    background: cfg.bg,
                    boxShadow: isHovered
                        ? `0 0 16px ${cfg.glow}0.2), 0 4px 20px rgba(0,0,0,0.6)`
                        : '0 4px 14px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, border-radius 0.3s ease',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '6px 10px' : '7px 10px 6px',
                        background: `${cfg.color}14`,
                        borderBottom: isMinimized ? 'none' : `1px solid ${cfg.border}`,
                        cursor: 'move',
                        gap: 6,
                        transition: 'padding 0.3s ease',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 600,
                            color: cfg.color,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>
                            {cfg.label}
                        </span>
                        {isMinimized && (
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#555',
                                whiteSpace: 'nowrap',
                            }}>
                                {createdTime}
                            </span>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {/* Copy button */}
                        <button
                            onClick={handleCopy}
                            style={{
                                opacity: isHovered || isMinimized ? 1 : 0,
                                background: copied ? `${cfg.glow}0.12)` : 'transparent',
                                border: `1px solid ${copied ? `${cfg.glow}0.3)` : 'transparent'}`,
                                borderRadius: 4,
                                color: copied ? cfg.color : '#666',
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                padding: '1px 5px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {copied ? '✓' : 'copy'}
                        </button>

                        {/* Minimize toggle */}
                        <button
                            onClick={handleToggleMinimize}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                            style={{
                                opacity: isHovered || isMinimized ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: cfg.color,
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={(e) => { e.stopPropagation(); removePromptNode(node.id); }}
                            title="Remove prompt node"
                            style={{
                                opacity: isHovered ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, color 0.15s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Collapsible body */}
                <div
                    style={{
                        maxHeight: isMinimized ? 0 : 400,
                        opacity: isMinimized ? 0 : 1,
                        overflow: 'hidden',
                        transition: animatingMinimize
                            ? 'max-height 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease'
                            : 'none',
                    }}
                >
                    {/* Prompt text */}
                    <div
                        data-scrollable="true"
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            padding: '10px 12px',
                            fontSize: 11,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            color: '#ccc',
                            lineHeight: 1.6,
                            maxHeight: 280,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            cursor: 'text',
                        }}
                    >
                        {node.text}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '4px 12px 8px',
                        borderTop: `1px solid ${cfg.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#444',
                        }}>
                            {node.model.split('/').pop()}
                        </span>
                        <span style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#444',
                        }}>
                            {createdTime}
                        </span>
                    </div>
                </div>

                {/* Resize handle */}
                {!isMinimized && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0, right: 0,
                            width: 16, height: 16,
                            cursor: 'se-resize',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'flex-end',
                            padding: '3px',
                            opacity: isHovered ? 0.7 : 0,
                            transition: 'opacity 0.15s ease',
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startW = node.width;
                            const onMove = (mv: MouseEvent) => {
                                const dx = mv.clientX - startX;
                                updatePromptNode(node.id, { width: Math.max(180, startW + dx / zoomScale) });
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
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
