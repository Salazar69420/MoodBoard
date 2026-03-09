import { useRef, useState, useCallback, useEffect } from 'react';
import type { CategoryNote } from '../../types';
import { SHOT_CATEGORIES } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useMention } from '../../hooks/useMention';

const MINIMIZED_HEIGHT = 36;

interface Props {
    note: CategoryNote;
    zoomScale?: number;
    autoFocus?: boolean;
}

const DRAG_THRESHOLD = 4;

export function CategoryNoteNode({ note, zoomScale = 1, autoFocus }: Props) {
    const updateCategoryNote = useBoardStore((s) => s.updateCategoryNote);
    const removeCategoryNote = useBoardStore((s) => s.removeCategoryNote);
    const connections = useBoardStore((s) => s.connections);
    const boardMode = useBoardStore((s) => s.boardMode);
    const images = useImageStore((s) => s.images);

    const connectedImages = images.filter(img =>
        connections.some(c =>
            (c.fromId === note.imageId && c.toId === img.id) ||
            (c.toId === note.imageId && c.fromId === img.id)
        )
    );
    const mention = useMention(connectedImages);

    const category = SHOT_CATEGORIES.find(c => c.id === note.categoryId)!;
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMinimized, setIsMinimized] = useState(note.isMinimized ?? false);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [localText, setLocalText] = useState(note.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Keep local text in sync when not editing
    useEffect(() => {
        if (!isEditing) setLocalText(note.text);
    }, [note.text, isEditing]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const dragRef = useRef<{
        startX: number;
        startY: number;
        startNodeX: number;
        startNodeY: number;
        hasMoved: boolean;
    } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startNodeX: note.x,
            startNodeY: note.y,
            hasMoved: false,
        };

        const handleMouseMove = (mv: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const dx = mv.clientX - drag.startX;
            const dy = mv.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;
            updateCategoryNote(note.id, {
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
    }, [note.id, note.x, note.y, zoomScale, updateCategoryNote]);

    const togglePrompt = useCallback((prompt: string) => {
        const checked = note.checkedPrompts.includes(prompt)
            ? note.checkedPrompts.filter(p => p !== prompt)
            : [...note.checkedPrompts, prompt];
        updateCategoryNote(note.id, { checkedPrompts: checked });
    }, [note.id, note.checkedPrompts, updateCategoryNote]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updateCategoryNote(note.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 350);
    }, [isMinimized, note.id, updateCategoryNote]);

    const completedCount = category.prompts.filter(p => note.checkedPrompts.includes(p)).length;
    const totalPrompts = category.prompts.length;
    const completionPct = Math.round((completedCount / totalPrompts) * 100);

    const isVisible = boardMode === 'i2v';

    return (
        <div
            className="absolute select-none"
            style={{
                left: note.x,
                top: note.y,
                width: isMinimized ? 'auto' : note.width,
                zIndex: isEditing ? 50 : isHovered ? 40 : isMinimized ? 10 : 22,
                opacity: mounted && isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
                transform: mounted && isVisible ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 350ms cubic-bezier(0.22, 1, 0.36, 1), width 350ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    borderRadius: isMinimized ? 8 : 10,
                    border: `1px solid ${isEditing || isHovered ? category.color : category.border}`,
                    background: category.bg,
                    boxShadow: isEditing
                        ? `0 0 20px ${category.color}30, 0 4px 24px rgba(0,0,0,0.6)`
                        : isHovered
                            ? `0 0 12px ${category.color}20, 0 4px 18px rgba(0,0,0,0.5)`
                            : '0 4px 14px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, border-radius 0.3s ease',
                }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '6px 10px' : '7px 10px 6px',
                        background: `${category.color}14`,
                        borderBottom: isMinimized ? 'none' : `1px solid ${category.border}`,
                        cursor: 'move',
                        gap: 6,
                        transition: 'padding 0.3s ease, border-bottom 0.3s ease',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{category.icon}</span>
                        <span style={{
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 600,
                            color: category.color,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>
                            {category.label}
                        </span>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {/* Completion badge — always visible */}
                        <div style={{
                            fontSize: 9,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: completionPct === 100 ? '#4ade80' : category.color,
                            background: completionPct === 100 ? 'rgba(74,222,128,0.12)' : `${category.color}18`,
                            border: `1px solid ${completionPct === 100 ? 'rgba(74,222,128,0.3)' : category.border}`,
                            borderRadius: 4,
                            padding: '1px 5px',
                            fontWeight: 600,
                            transition: 'color 0.2s ease',
                        }}>
                            {completedCount}/{totalPrompts}
                        </div>

                        {/* Minimize/Maximize toggle */}
                        <button
                            style={{
                                opacity: isHovered || isMinimized ? 1 : 0,
                                background: 'transparent',
                                border: 'none',
                                color: category.color,
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                            onClick={handleToggleMinimize}
                            title={isMinimized ? 'Expand note' : 'Minimize note'}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
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
                            onClick={(e) => { e.stopPropagation(); removeCategoryNote(note.id); }}
                            title="Remove note"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Collapsible Body ── */}
                <div
                    style={{
                        maxHeight: isMinimized ? 0 : 600,
                        opacity: isMinimized ? 0 : 1,
                        overflow: 'hidden',
                        transition: animatingMinimize
                            ? 'max-height 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease'
                            : 'none',
                    }}
                >
                    {/* ── Prompt checklist ── */}
                    <div style={{ padding: '8px 10px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {category.prompts.map(prompt => {
                            const checked = note.checkedPrompts.includes(prompt);
                            return (
                                <label
                                    key={prompt}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 7,
                                        cursor: 'pointer',
                                        padding: '2px 0',
                                    }}
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    {/* Custom checkbox */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); togglePrompt(prompt); }}
                                        style={{
                                            width: 13,
                                            height: 13,
                                            borderRadius: 3,
                                            border: `1.5px solid ${checked ? category.color : '#333'}`,
                                            background: checked ? `${category.color}30` : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 0.12s ease',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {checked && (
                                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                                <polyline
                                                    points="2,6 5,9 10,3"
                                                    stroke={category.color}
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: 10,
                                        fontFamily: "'Inter', system-ui, sans-serif",
                                        color: checked ? category.color : '#777',
                                        textDecoration: checked ? 'none' : 'none',
                                        transition: 'color 0.12s ease',
                                        userSelect: 'none',
                                    }}>
                                        {prompt}
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    {/* ── Progress bar ── */}
                    <div style={{ margin: '6px 10px 0', height: 2, background: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${completionPct}%`,
                            background: completionPct === 100
                                ? 'linear-gradient(to right, #4ade80, #22c55e)'
                                : `linear-gradient(to right, ${category.color}80, ${category.color})`,
                            borderRadius: 1,
                            transition: 'width 0.3s ease',
                        }} />
                    </div>

                    {/* ── Textarea ── */}
                    <div style={{ position: 'relative' }}>
                        <textarea
                            ref={textareaRef}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                resize: 'none',
                                outline: 'none',
                                border: 'none',
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: 12,
                                color: '#ccc',
                                padding: '8px 10px 10px',
                                lineHeight: '1.55',
                                caretColor: category.color,
                                height: Math.max(64, note.height - 108),
                                minHeight: 64,
                                cursor: isEditing ? 'text' : 'inherit',
                                overflowY: 'auto',
                            }}
                            placeholder={category.placeholder}
                            value={localText}
                            onFocus={() => setIsEditing(true)}
                            onBlur={() => {
                                setTimeout(() => {
                                    setIsEditing(false);
                                    updateCategoryNote(note.id, { text: localText });
                                }, 150);
                            }}
                            onChange={(e) => {
                                setLocalText(e.target.value);
                                updateCategoryNote(note.id, { text: e.target.value });
                                mention.handleChange(e.target.value, e.target.selectionStart);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (mention.handleKeyDown(e as any, localText, textareaRef.current?.selectionStart || 0, (newVal, pos) => {
                                    setLocalText(newVal);
                                    updateCategoryNote(note.id, { text: newVal });
                                    setTimeout(() => {
                                        if (textareaRef.current) {
                                            textareaRef.current.selectionStart = pos;
                                            textareaRef.current.selectionEnd = pos;
                                        }
                                    }, 0);
                                })) {
                                    return;
                                }
                                if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                            }}
                        />
                        {mention.isOpen && (
                            <div style={{
                                position: 'absolute', bottom: '100%', left: 10,
                                background: '#1a1a1a', border: '1px solid #333',
                                borderRadius: 6, padding: 4, zIndex: 100,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                maxHeight: 150, overflowY: 'auto',
                                minWidth: 150,
                            }}>
                                {mention.filteredItems.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: '4px 8px', cursor: 'pointer',
                                            borderRadius: 4, fontSize: 11,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            background: idx === mention.selectedIndex ? '#333' : 'transparent',
                                            color: idx === mention.selectedIndex ? '#fff' : '#aaa',
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            mention.selectItem(item, localText, textareaRef.current?.selectionStart || 0, (newVal, pos) => {
                                                setLocalText(newVal);
                                                updateCategoryNote(note.id, { text: newVal });
                                                setTimeout(() => {
                                                    if (textareaRef.current) {
                                                        textareaRef.current.focus();
                                                        textareaRef.current.selectionStart = pos;
                                                        textareaRef.current.selectionEnd = pos;
                                                    }
                                                }, 0);
                                            });
                                        }}
                                    >
                                        <span style={{ color: category.color, marginRight: 4 }}>@</span>
                                        {item.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Resize handle ── */}
                {!isMinimized && (
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
                            opacity: isHovered ? 0.7 : 0,
                            transition: 'opacity 0.15s ease',
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startW = note.width;
                            const startH = note.height;
                            const onMove = (mv: MouseEvent) => {
                                const dx = mv.clientX - startX;
                                const dy = mv.clientY - startY;
                                updateCategoryNote(note.id, {
                                    width: Math.max(180, startW + dx),
                                    height: Math.max(160, startH + dy),
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
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={category.color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}

export { MINIMIZED_HEIGHT as CATEGORY_NOTE_MINIMIZED_HEIGHT };
