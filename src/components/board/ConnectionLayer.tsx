import { useState, useRef, useEffect, useCallback } from 'react';
import type { Connection, BoardImage } from '../../types';

// Must match CanvasImage's DISPLAY_MAX_WIDTH exactly
const DISPLAY_MAX_WIDTH = 350;

function nodeRect(img: BoardImage) {
    const displayW = img.displayWidth ?? Math.min(img.width, DISPLAY_MAX_WIDTH);
    const displayH = img.displayHeight ?? (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
    return { x: img.x, y: img.y, w: displayW, h: displayH };
}

function nodeOutputAnchor(img: BoardImage) {
    const r = nodeRect(img);
    return { x: r.x + r.w, y: r.y + r.h / 2 };
}

function nodeInputAnchor(img: BoardImage) {
    const r = nodeRect(img);
    return { x: r.x, y: r.y + r.h / 2 };
}

/** Bezier path that exits/enters horizontally */
function bezierPath(fx: number, fy: number, tx: number, ty: number): string {
    const dx = Math.abs(tx - fx);
    const cp = Math.max(80, dx * 0.5);
    return `M ${fx},${fy} C ${fx + cp},${fy} ${tx - cp},${ty} ${tx},${ty}`;
}

function pathLength(fx: number, fy: number, tx: number, ty: number): number {
    // Rough estimate for stroke-dasharray
    const dx = tx - fx;
    const dy = ty - fy;
    return Math.sqrt(dx * dx + dy * dy) * 1.5;
}

interface Props {
    connections: Connection[];
    images: BoardImage[];
    pendingFromId: string | null;
    mousePos: { x: number; y: number };
    onDelete: (id: string) => void;
    onUpdateLabel: (id: string, label: string) => Promise<void>;
}

interface NewConnAnim {
    id: string;
    phase: 'draw' | 'pulse' | 'done';
    len: number;
}

export function ConnectionLayer({
    connections,
    images,
    pendingFromId,
    mousePos,
    onDelete,
    onUpdateLabel,
}: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [newConnAnims, setNewConnAnims] = useState<NewConnAnim[]>([]);
    const prevConnIds = useRef<Set<string>>(new Set(connections.map(c => c.id)));

    const map = new Map(images.map((i) => [i.id, i]));

    // Detect newly added connections to trigger draw animation
    useEffect(() => {
        const currentIds = new Set(connections.map(c => c.id));
        for (const c of connections) {
            if (!prevConnIds.current.has(c.id)) {
                const from = map.get(c.fromId);
                const to = map.get(c.toId);
                if (from && to) {
                    const f = nodeOutputAnchor(from);
                    const t = nodeInputAnchor(to);
                    const len = pathLength(f.x, f.y, t.x, t.y);
                    setNewConnAnims(prev => [...prev, { id: c.id, phase: 'draw', len }]);
                    // After draw (0.4s) → pulse (0.6s) → done
                    setTimeout(() => {
                        setNewConnAnims(prev => prev.map(a => a.id === c.id ? { ...a, phase: 'pulse' } : a));
                        setTimeout(() => {
                            setNewConnAnims(prev => prev.filter(a => a.id !== c.id));
                        }, 700);
                    }, 450);
                }
            }
        }
        prevConnIds.current = currentIds;
    }, [connections]);

    const handleConnClick = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedId(prev => prev === id ? null : id);
    }, []);

    return (
        <svg
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
                zIndex: 5,
            }}
        >
            <defs>
                {/* Orange arrowhead */}
                <marker
                    id="conn-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 7 3.5, 0 7" fill="#aaaaaa" />
                </marker>
                <marker
                    id="conn-arrow-hover"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 7 3.5, 0 7" fill="#f97316" />
                </marker>
                <marker
                    id="conn-arrow-selected"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 7 3.5, 0 7" fill="#f97316" />
                </marker>
                <marker
                    id="conn-arrow-pending"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 7 3.5, 0 7" fill="#aaaaaa" opacity="0.5" />
                </marker>
                {/* Pulse light marker */}
                <marker
                    id="conn-arrow-pulse"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 7 3.5, 0 7" fill="white" />
                </marker>
                <filter id="conn-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="conn-glow-strong" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {connections.map((c) => {
                const from = map.get(c.fromId);
                const to = map.get(c.toId);
                if (!from || !to) return null;
                const f = nodeOutputAnchor(from);
                const t = nodeInputAnchor(to);
                const pathD = bezierPath(f.x, f.y, t.x, t.y);
                const isEditing = editingId === c.id;
                const isSelected = selectedId === c.id;
                const isHovered = hoveredId === c.id;
                const anim = newConnAnims.find(a => a.id === c.id);
                const len = anim?.len ?? pathLength(f.x, f.y, t.x, t.y);

                const lineColor = (isSelected || isHovered) ? '#f97316' : '#aaaaaa';
                const arrowMarker = isSelected
                    ? 'url(#conn-arrow-selected)'
                    : isHovered
                        ? 'url(#conn-arrow-hover)'
                        : 'url(#conn-arrow)';

                return (
                    <g key={c.id} style={{ pointerEvents: 'all' }}>
                        {/* Wide invisible hit area */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={18}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleConnClick(e, c.id)}
                            onMouseEnter={() => setHoveredId(c.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onDoubleClick={() => { setEditingId(c.id); setDraft(c.label || ''); }}
                            onContextMenu={(e) => { e.preventDefault(); onDelete(c.id); }}
                        />

                        {/* Visible line — draw animation on new connections */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={anim?.phase === 'draw' ? 1.5 : 1.5}
                            strokeOpacity={anim ? (anim.phase === 'draw' ? 0.9 : 0.85) : 0.85}
                            markerEnd={arrowMarker}
                            filter={isSelected || isHovered ? 'url(#conn-glow)' : undefined}
                            style={{
                                cursor: 'pointer',
                                strokeDasharray: anim?.phase === 'draw' ? `${len} ${len}` : undefined,
                                strokeDashoffset: anim?.phase === 'draw' ? len : undefined,
                                animation: anim?.phase === 'draw'
                                    ? `drawLine 0.4s cubic-bezier(0.22,1,0.36,1) forwards`
                                    : undefined,
                                transition: 'stroke 0.15s ease, stroke-opacity 0.15s ease',
                            }}
                            onMouseEnter={() => setHoveredId(c.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={(e) => handleConnClick(e, c.id)}
                            onDoubleClick={() => { setEditingId(c.id); setDraft(c.label || ''); }}
                            onContextMenu={(e) => { e.preventDefault(); onDelete(c.id); }}
                        />

                        {/* Data pulse traveling along the line (after draw) */}
                        {anim?.phase === 'pulse' && (
                            <path
                                d={pathD}
                                fill="none"
                                stroke="rgba(255,255,255,0.9)"
                                strokeWidth={2}
                                strokeDasharray={`12 ${len}`}
                                markerEnd="url(#conn-arrow-pulse)"
                                filter="url(#conn-glow-strong)"
                                style={{
                                    animation: `connPulse 0.6s ease-in-out forwards`,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}

                        {/* Selection indicator — delete button at midpoint */}
                        {isSelected && (() => {
                            const mx = (f.x + t.x) / 2;
                            const my = (f.y + t.y) / 2;
                            return (
                                <g style={{ pointerEvents: 'all', cursor: 'pointer' }}>
                                    <circle
                                        cx={mx}
                                        cy={my}
                                        r={11}
                                        fill="#1a1a1a"
                                        stroke="#f97316"
                                        strokeWidth={1.5}
                                        onClick={(e) => { e.stopPropagation(); onDelete(c.id); setSelectedId(null); }}
                                    />
                                    <text
                                        x={mx}
                                        y={my + 4}
                                        textAnchor="middle"
                                        fill="#f97316"
                                        fontSize={13}
                                        fontWeight="bold"
                                        style={{ pointerEvents: 'none', fontFamily: 'monospace' }}
                                    >
                                        ×
                                    </text>
                                </g>
                            );
                        })()}

                        {/* Connection label */}
                        {!isEditing && c.label && (
                            <text
                                x={(f.x + t.x) / 2}
                                y={(f.y + t.y) / 2 - 12}
                                textAnchor="middle"
                                fill={isSelected || isHovered ? '#f97316' : '#aaa'}
                                fontSize={10}
                                fontFamily="'JetBrains Mono', monospace"
                                style={{
                                    pointerEvents: 'all',
                                    cursor: 'text',
                                    filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                                    transition: 'fill 0.15s ease',
                                }}
                                onDoubleClick={() => { setEditingId(c.id); setDraft(c.label || ''); }}
                            >
                                {c.label}
                            </text>
                        )}

                        {isEditing && (() => {
                            const mx = (f.x + t.x) / 2;
                            const my = (f.y + t.y) / 2;
                            return (
                                <foreignObject x={mx - 90} y={my - 30} width={180} height={30}>
                                    <input
                                        // @ts-ignore
                                        xmlns="http://www.w3.org/1999/xhtml"
                                        autoFocus
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onBlur={() => { onUpdateLabel(c.id, draft); setEditingId(null); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { onUpdateLabel(c.id, draft); setEditingId(null); }
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        placeholder="Add label…"
                                        style={{
                                            width: '100%',
                                            fontSize: 11,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            background: '#111',
                                            color: '#e5e5e5',
                                            border: '1px solid #f97316',
                                            borderRadius: 4,
                                            padding: '3px 8px',
                                            outline: 'none',
                                            boxShadow: '0 0 8px rgba(249,115,22,0.3)',
                                        }}
                                    />
                                </foreignObject>
                            );
                        })()}
                    </g>
                );
            })}

            {/* Live pending arrow while dragging from handle */}
            {pendingFromId && (() => {
                const from = map.get(pendingFromId);
                if (!from) return null;
                const f = nodeOutputAnchor(from);
                const pathD = bezierPath(f.x, f.y, mousePos.x, mousePos.y);
                return (
                    <path
                        d={pathD}
                        fill="none"
                        stroke="#aaaaaa"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        strokeOpacity={0.6}
                        markerEnd="url(#conn-arrow-pending)"
                    />
                );
            })()}
        </svg>
    );
}
