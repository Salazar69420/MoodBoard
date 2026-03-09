import { useState } from 'react';
import { useSettingsStore, DEFAULT_MODELS } from '../../stores/useSettingsStore';
import type { ModelEntry } from '../../stores/useSettingsStore';

export function SettingsModal() {
    const {
        apiKey, model, customModels, showSettings,
        setApiKey, setModel, addCustomModel, removeCustomModel, closeSettings,
    } = useSettingsStore();

    const [localKey, setLocalKey] = useState(apiKey);
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [justAdded, setJustAdded] = useState<string | null>(null);

    if (!showSettings) return null;

    const handleSave = () => {
        setApiKey(localKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleAddCustom = () => {
        const trimmed = customInput.trim();
        if (!trimmed) return;
        addCustomModel(trimmed);
        setJustAdded(trimmed);
        setCustomInput('');
        setTimeout(() => setJustAdded(null), 1200);
    };

    const allModels: ModelEntry[] = [...DEFAULT_MODELS, ...customModels];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={closeSettings}
        >
            <div
                style={{
                    width: 440,
                    maxHeight: '85vh',
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: 14,
                    boxShadow: '0 16px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.03)',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.2s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px 12px',
                    borderBottom: '1px solid #1e1e1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span style={{
                            fontSize: 14,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 600,
                            color: '#e5e5e5',
                        }}>
                            Settings
                        </span>
                    </div>
                    <button
                        onClick={closeSettings}
                        style={{
                            background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                            padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.12s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e5e5e5'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#666'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable content */}
                <div style={{
                    padding: '16px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {/* ── API Key ── */}
                    <div>
                        <label style={{
                            display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: '#888', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                            OpenRouter API Key
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={localKey}
                                    onChange={e => setLocalKey(e.target.value)}
                                    placeholder="sk-or-v1-..."
                                    style={{
                                        width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a',
                                        borderRadius: 8, color: '#e5e5e5', fontSize: 13,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        padding: '9px 40px 9px 12px', outline: 'none',
                                        transition: 'border-color 0.12s ease',
                                    }}
                                    onFocus={e => (e.target as HTMLElement).style.borderColor = '#f97316'}
                                    onBlur={e => (e.target as HTMLElement).style.borderColor = '#2a2a2a'}
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    style={{
                                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                                        padding: 4, display: 'flex',
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {showKey ? (
                                            <>
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </>
                                        ) : (
                                            <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={handleSave}
                                style={{
                                    background: saved ? 'rgba(74,222,128,0.15)' : 'rgba(249,115,22,0.12)',
                                    border: `1px solid ${saved ? 'rgba(74,222,128,0.3)' : 'rgba(249,115,22,0.25)'}`,
                                    color: saved ? '#4ade80' : '#f97316', borderRadius: 8,
                                    padding: '0 14px', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                                }}
                            >
                                {saved ? '✓ Saved' : 'Save'}
                            </button>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 10, color: '#555', fontFamily: "'Inter', system-ui, sans-serif" }}>
                            Get your key at{' '}
                            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                                style={{ color: '#f97316', textDecoration: 'none' }}>openrouter.ai/keys</a>
                        </div>
                    </div>

                    {/* ── Model Selection ── */}
                    <div>
                        <label style={{
                            display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: '#888', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                            AI Model
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {allModels.map(m => {
                                const isSelected = model === m.id;
                                const isNew = justAdded === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0,
                                            animation: isNew ? 'modalSlideUp 0.25s ease-out' : undefined,
                                        }}
                                    >
                                        <button
                                            onClick={() => setModel(m.id)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                borderRadius: m.isCustom ? '8px 0 0 8px' : 8,
                                                border: isSelected
                                                    ? '1px solid rgba(249,115,22,0.4)'
                                                    : '1px solid #1e1e1e',
                                                borderRight: m.isCustom ? 'none' : undefined,
                                                background: isSelected ? 'rgba(249,115,22,0.08)' : '#0d0d0d',
                                                cursor: 'pointer',
                                                transition: 'all 0.12s ease',
                                                textAlign: 'left',
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLElement).style.borderColor = '#333';
                                                    (e.currentTarget as HTMLElement).style.background = '#141414';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e';
                                                    (e.currentTarget as HTMLElement).style.background = '#0d0d0d';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {isSelected && (
                                                    <div style={{
                                                        width: 6, height: 6, borderRadius: '50%',
                                                        background: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.6)', flexShrink: 0,
                                                    }} />
                                                )}
                                                <span style={{
                                                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                                                    color: isSelected ? '#f97316' : '#ccc',
                                                    fontWeight: isSelected ? 600 : 400,
                                                }}>
                                                    {m.label}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                                                color: '#555', background: '#1a1a1a',
                                                border: '1px solid #222', borderRadius: 4,
                                                padding: '1px 6px',
                                            }}>
                                                {m.provider}
                                            </span>
                                        </button>

                                        {/* Delete button for custom models */}
                                        {m.isCustom && (
                                            <button
                                                onClick={() => removeCustomModel(m.id)}
                                                title="Remove custom model"
                                                style={{
                                                    padding: '8px 10px',
                                                    borderRadius: '0 8px 8px 0',
                                                    border: isSelected
                                                        ? '1px solid rgba(249,115,22,0.4)'
                                                        : '1px solid #1e1e1e',
                                                    borderLeft: `1px solid ${isSelected ? 'rgba(249,115,22,0.2)' : '#1a1a1a'}`,
                                                    background: isSelected ? 'rgba(249,115,22,0.08)' : '#0d0d0d',
                                                    color: '#555',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.12s ease',
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                                                }}
                                                onMouseLeave={e => {
                                                    (e.currentTarget as HTMLElement).style.color = '#555';
                                                    (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(249,115,22,0.08)' : '#0d0d0d';
                                                }}
                                            >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Add Custom Model ── */}
                    <div>
                        <label style={{
                            display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: '#888', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>
                            Add Custom Model
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                type="text"
                                value={customInput}
                                onChange={e => setCustomInput(e.target.value)}
                                placeholder="e.g. openai/gpt-5.4-pro"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddCustom();
                                }}
                                style={{
                                    flex: 1, background: '#0a0a0a', border: '1px solid #2a2a2a',
                                    borderRadius: 8, color: '#e5e5e5', fontSize: 13,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    padding: '9px 12px', outline: 'none',
                                    transition: 'border-color 0.12s ease',
                                }}
                                onFocus={e => (e.target as HTMLElement).style.borderColor = '#f97316'}
                                onBlur={e => (e.target as HTMLElement).style.borderColor = '#2a2a2a'}
                            />
                            <button
                                onClick={handleAddCustom}
                                disabled={!customInput.trim()}
                                style={{
                                    background: customInput.trim() ? 'rgba(249,115,22,0.12)' : '#0d0d0d',
                                    border: `1px solid ${customInput.trim() ? 'rgba(249,115,22,0.25)' : '#1e1e1e'}`,
                                    color: customInput.trim() ? '#f97316' : '#444',
                                    borderRadius: 8, padding: '0 14px',
                                    fontSize: 18, fontWeight: 300,
                                    cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                +
                            </button>
                        </div>
                        <div style={{
                            marginTop: 6, fontSize: 10, color: '#555',
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                            Paste the model ID from{' '}
                            <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer"
                                style={{ color: '#f97316', textDecoration: 'none' }}>openrouter.ai/models</a>
                            {' '}(e.g. <code style={{
                                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                                color: '#888', background: '#1a1a1a',
                                padding: '1px 4px', borderRadius: 3,
                            }}>openai/gpt-5.4-pro</code>)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
