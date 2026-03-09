import { useState, useCallback } from 'react';
import type { BoardImage, CategoryNote } from '../../types';
import { SHOT_CATEGORIES } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { generatePrompt, type PromptResult } from '../../utils/prompt-generator';
import { useBoardStore } from '../../stores/useBoardStore';
import { useProjectStore } from '../../stores/useProjectStore';

interface Props {
    image: BoardImage;
    notes: CategoryNote[];
    connectedImages?: BoardImage[];
}

export function PromptGenerator({ image, notes, connectedImages = [] }: Props) {
    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);
    const toggleSettings = useSettingsStore((s) => s.toggleSettings);
    const addPromptNode = useBoardStore((s) => s.addPromptNode);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);

    const [showConfirm, setShowConfirm] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<PromptResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const filledCats = new Set(notes.map(n => n.categoryId));
    const missingCount = SHOT_CATEGORIES.length - filledCats.size;
    const hasAnyNotes = notes.length > 0 && notes.some(n => n.text.trim() || n.checkedPrompts.length > 0);

    const handleClick = useCallback(() => {
        if (!apiKey) {
            toggleSettings();
            return;
        }
        if (missingCount > 0) {
            setShowConfirm(true);
        } else {
            doGenerate();
        }
    }, [apiKey, missingCount]);

    const doGenerate = useCallback(async () => {
        setShowConfirm(false);
        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const res = await generatePrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages);
            setResult(res);
            // Persist as a canvas node
            if (currentProjectId) {
                const displayW = image.displayWidth ?? Math.min(image.width, 350);
                await addPromptNode(
                    currentProjectId,
                    image.id,
                    res.prompt,
                    res.model,
                    'i2v',
                    image.x + displayW + 24,
                    image.y + 200,
                );
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, model, image, notes, connectedImages, addPromptNode, currentProjectId]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    }, [result]);

    if (!hasAnyNotes) return null;

    return (
        <>
            {/* Process Prompt Button — below image */}
            <div
                style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); handleClick(); }}
                    onMouseDown={e => e.stopPropagation()}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    disabled={isGenerating}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: isGenerating
                            ? '1px solid rgba(249,115,22,0.3)'
                            : isHovered
                                ? '1px solid rgba(249,115,22,0.5)'
                                : '1px solid #222',
                        background: isGenerating
                            ? 'rgba(249,115,22,0.06)'
                            : isHovered
                                ? 'rgba(249,115,22,0.08)'
                                : '#111',
                        cursor: isGenerating ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isHovered && !isGenerating
                            ? '0 0 16px rgba(249,115,22,0.12)'
                            : 'none',
                    }}
                >
                    {isGenerating ? (
                        <>
                            <div style={{
                                width: 14,
                                height: 14,
                                border: '2px solid rgba(249,115,22,0.2)',
                                borderTopColor: '#f97316',
                                borderRadius: '50%',
                                animation: 'spin 0.7s linear infinite',
                            }} />
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#f97316',
                                letterSpacing: '0.04em',
                            }}>
                                Generating...
                            </span>
                        </>
                    ) : (
                        <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#f97316' : '#888'} strokeWidth="2" style={{ transition: 'stroke 0.12s ease' }}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: isHovered ? '#f97316' : '#aaa',
                                fontWeight: 500,
                                letterSpacing: '0.03em',
                                transition: 'color 0.12s ease',
                            }}>
                                Process Prompt
                            </span>
                            {missingCount > 0 && (
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#666',
                                    background: '#1a1a1a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                }}>
                                    {filledCats.size}/{SHOT_CATEGORIES.length}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(6px)',
                        animation: 'fadeIn 0.12s ease-out',
                    }}
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        style={{
                            width: 380,
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: 14,
                            boxShadow: '0 16px 60px rgba(0,0,0,0.9)',
                            overflow: 'hidden',
                            animation: 'modalSlideUp 0.2s ease-out',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 20px 16px' }}>
                            {/* Warning icon */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'rgba(249,115,22,0.1)',
                                border: '1px solid rgba(249,115,22,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>

                            <h3 style={{
                                fontSize: 15,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontWeight: 600,
                                color: '#e5e5e5',
                                marginBottom: 8,
                            }}>
                                Incomplete Shot Notes
                            </h3>

                            <p style={{
                                fontSize: 13,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                color: '#888',
                                lineHeight: 1.5,
                                marginBottom: 16,
                            }}>
                                You have <span style={{ color: '#f97316', fontWeight: 600 }}>{missingCount}</span> of{' '}
                                {SHOT_CATEGORIES.length} categories missing. The generated prompt will only include the notes you've written.
                            </p>

                            {/* Missing categories */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 4,
                                marginBottom: 4,
                            }}>
                                {SHOT_CATEGORIES.filter(c => !filledCats.has(c.id)).map(cat => (
                                    <span
                                        key={cat.id}
                                        style={{
                                            fontSize: 10,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: `${cat.color}12`,
                                            border: `1px solid ${cat.border}`,
                                            color: cat.color,
                                            opacity: 0.6,
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            padding: '12px 20px 16px',
                            borderTop: '1px solid #1e1e1e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 8,
                        }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: 8,
                                    border: '1px solid #2a2a2a',
                                    background: 'transparent',
                                    color: '#aaa',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                                    (e.currentTarget as HTMLElement).style.color = '#ddd';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#aaa';
                                }}
                            >
                                Go Back
                            </button>
                            <button
                                onClick={doGenerate}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(249,115,22,0.4)',
                                    background: 'rgba(249,115,22,0.12)',
                                    color: '#f97316',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                    boxShadow: '0 0 12px rgba(249,115,22,0.1)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.2)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.2)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(249,115,22,0.1)';
                                }}
                            >
                                Generate Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Card */}
            {(result || error) && (
                <div
                    style={{
                        marginTop: 8,
                        borderRadius: 10,
                        border: `1px solid ${error ? '#3b1515' : '#1e3a2a'}`,
                        background: error ? '#120808' : '#0a1511',
                        boxShadow: error
                            ? '0 4px 16px rgba(239,68,68,0.1)'
                            : '0 4px 16px rgba(74,222,128,0.08)',
                        overflow: 'hidden',
                        animation: 'modalSlideUp 0.25s ease-out',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '8px 12px 6px',
                        borderBottom: `1px solid ${error ? '#2a1010' : '#143d24'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {error ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            )}
                            <span style={{
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: error ? '#ef4444' : '#4ade80',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                            }}>
                                {error ? 'Error' : 'Generated Prompt'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {result && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{
                                        background: copied ? 'rgba(74,222,128,0.15)' : 'transparent',
                                        border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : '#2a2a2a'}`,
                                        borderRadius: 5,
                                        color: copied ? '#4ade80' : '#888',
                                        fontSize: 10,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        padding: '2px 8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                    onMouseEnter={e => {
                                        if (!copied) (e.currentTarget as HTMLElement).style.color = '#e5e5e5';
                                    }}
                                    onMouseLeave={e => {
                                        if (!copied) (e.currentTarget as HTMLElement).style.color = '#888';
                                    }}
                                >
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setResult(null); setError(null); }}
                                onMouseDown={e => e.stopPropagation()}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#555',
                                    cursor: 'pointer',
                                    padding: 2,
                                    display: 'flex',
                                    transition: 'color 0.12s ease',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#aaa'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div
                        style={{
                            padding: '10px 12px 12px',
                            fontSize: 12,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            lineHeight: 1.6,
                            color: error ? '#ef4444' : '#ccc',
                            maxHeight: 200,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            cursor: 'text',
                        }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {error || result?.prompt}
                    </div>

                    {/* Model info footer */}
                    {result && (
                        <div style={{
                            padding: '4px 12px 8px',
                            borderTop: '1px solid #143d24',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#3a6a3a',
                            }}>
                                {result.model.split('/').pop()}
                            </span>
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#3a6a3a',
                            }}>
                                {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
