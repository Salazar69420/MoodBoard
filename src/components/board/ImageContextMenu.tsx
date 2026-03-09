import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useImageStore } from '../../stores/useImageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { copyImageToClipboard } from '../../utils/clipboard';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import type { ShotCategoryId, EditCategoryId } from '../../types';

export function ImageContextMenu() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const showToast = useUIStore((s) => s.showToast);
  const images = useImageStore((s) => s.images);
  const removeImage = useImageStore((s) => s.removeImage);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const decrementImageCount = useProjectStore((s) => s.decrementImageCount);
  const addCategoryNote = useBoardStore((s) => s.addCategoryNote);
  const addEditNote = useBoardStore((s) => s.addEditNote);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const removeCategoryNotesForImage = useBoardStore((s) => s.removeCategoryNotesForImage);
  const removeEditNotesForImage = useBoardStore((s) => s.removeEditNotesForImage);

  const [showNoteSubmenu, setShowNoteSubmenu] = useState(false);
  const [activeSection, setActiveSection] = useState<'i2v' | 'edit'>('i2v');

  useEffect(() => {
    if (!contextMenu.visible) {
      setShowNoteSubmenu(false);
      setActiveSection('i2v');
      return;
    }
    const handleClick = () => hideContextMenu();
    const handleCtx = () => hideContextMenu();
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleCtx);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleCtx);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible || !contextMenu.targetImageId) return null;

  const image = images.find((i) => i.id === contextMenu.targetImageId);
  if (!image) return null;

  // Which categories already have notes for this image?
  const existingI2vCats = new Set<ShotCategoryId>(
    categoryNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)
  );
  const existingEditCats = new Set<EditCategoryId>(
    editNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)
  );

  const handleCopy = async () => {
    const success = await copyImageToClipboard(image.blobId);
    showToast(success ? 'Copied to clipboard' : 'Failed to copy');
    hideContextMenu();
  };

  const handleDelete = async () => {
    await removeCategoryNotesForImage(image.id);
    await removeEditNotesForImage(image.id);
    await removeImage(image.id);
    if (currentProjectId) decrementImageCount(currentProjectId);
    showToast('Shot deleted');
    hideContextMenu();
  };

  const handleAddI2vNote = async (categoryId: ShotCategoryId) => {
    if (!currentProjectId) return;
    const displayW = image.displayWidth ?? Math.min(image.width, 350);
    const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
    const allEditNotes = editNotes.filter(n => n.imageId === image.id);
    const offsetY = (imageNotes.length + allEditNotes.length) * 180;

    await addCategoryNote(
      currentProjectId,
      image.id,
      categoryId,
      image.x + displayW + 60,
      image.y + offsetY,
    );

    showToast(`${SHOT_CATEGORIES.find(c => c.id === categoryId)?.label} note added`);
    hideContextMenu();
  };

  const handleAddEditNote = async (categoryId: EditCategoryId) => {
    if (!currentProjectId) return;
    const displayW = image.displayWidth ?? Math.min(image.width, 350);
    const imageNotes = categoryNotes.filter(n => n.imageId === image.id);
    const allEditNotes = editNotes.filter(n => n.imageId === image.id);
    const offsetY = (imageNotes.length + allEditNotes.length) * 180;

    await addEditNote(
      currentProjectId,
      image.id,
      categoryId,
      image.x + displayW + 60,
      image.y + offsetY,
    );

    showToast(`${EDIT_CATEGORIES.find(c => c.id === categoryId)?.label} note added`);
    hideContextMenu();
  };

  const x = Math.min(contextMenu.x, window.innerWidth - 320);
  const y = Math.min(contextMenu.y, window.innerHeight - 500);

  const keepCats = EDIT_CATEGORIES.filter(c => c.zone === 'keep');
  const cutCats = EDIT_CATEGORIES.filter(c => c.zone === 'cut');

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 200,
        left: x,
        top: y,
        background: '#111',
        border: '1px solid #222',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
        minWidth: 280,
        maxWidth: 340,
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header label ── */}
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 10, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Shot Options
        </span>
      </div>

      {/* ── Add Note → submenu trigger ── */}
      <div style={{ padding: '4px' }}>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: 6,
            background: showNoteSubmenu ? 'rgba(249,115,22,0.1)' : 'transparent',
            border: 'none',
            color: showNoteSubmenu ? '#f97316' : '#ddd',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s ease, color 0.12s ease',
            textAlign: 'left',
            gap: 8,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.08)';
            (e.currentTarget as HTMLElement).style.color = '#f97316';
            setShowNoteSubmenu(true);
          }}
          onMouseLeave={e => {
            if (!showNoteSubmenu) {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#ddd';
            }
          }}
          onClick={() => setShowNoteSubmenu(!showNoteSubmenu)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📎</span>
            <span>Add Shot Note</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#555',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 3,
              padding: '1px 4px',
            }}>
              {existingI2vCats.size + existingEditCats.size}/{SHOT_CATEGORIES.length + EDIT_CATEGORIES.length}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* ── Section Tabs & Category Grid ── */}
        {showNoteSubmenu && (
          <div style={{
            margin: '4px 0',
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSection('i2v'); }}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeSection === 'i2v' ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: activeSection === 'i2v' ? '#f97316' : '#666',
                  borderBottom: activeSection === 'i2v' ? '2px solid #f97316' : '2px solid transparent',
                }}
              >
                🎬 I2V Prompting
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSection('edit'); }}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeSection === 'edit' ? 'rgba(34,211,238,0.1)' : 'transparent',
                  color: activeSection === 'edit' ? '#22d3ee' : '#666',
                  borderBottom: activeSection === 'edit' ? '2px solid #22d3ee' : '2px solid transparent',
                }}
              >
                ✏️ Image Edit
              </button>
            </div>

            {/* I2V Section */}
            {activeSection === 'i2v' && (
              <div style={{
                padding: '6px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {SHOT_CATEGORIES.map(cat => {
                  const hasNote = existingI2vCats.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddI2vNote(cat.id);
                      }}
                      disabled={hasNote}
                      title={hasNote ? `${cat.label} note already added` : `Add ${cat.label} note`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: `1px solid ${hasNote ? '#1e1e1e' : cat.border}`,
                        background: hasNote ? '#0a0a0a' : cat.bg,
                        cursor: hasNote ? 'not-allowed' : 'pointer',
                        opacity: hasNote ? 0.45 : 1,
                        transition: 'all 0.12s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!hasNote) {
                          (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}`;
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${cat.color}30`;
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.border = `1px solid ${hasNote ? '#1e1e1e' : cat.border}`;
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{cat.icon}</span>
                      <span style={{
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: hasNote ? '#555' : cat.color,
                        fontWeight: 600,
                      }}>
                        {cat.label}
                      </span>
                      {hasNote && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4ade80"
                          strokeWidth="2.5"
                          style={{ marginLeft: 'auto', flexShrink: 0 }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Edit Section */}
            {activeSection === 'edit' && (
              <div style={{
                maxHeight: 340,
                overflowY: 'auto',
              }}>
                {/* KEEP zone */}
                <div style={{ padding: '6px 6px 2px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 6px',
                    marginBottom: 4,
                  }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#4ade80',
                      boxShadow: '0 0 6px rgba(74,222,128,0.5)',
                    }} />
                    <span style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#4ade80',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Zone 1 — Keep
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 4,
                  }}>
                    {keepCats.map(cat => {
                      const hasNote = existingEditCats.has(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddEditNote(cat.id);
                          }}
                          disabled={hasNote}
                          title={hasNote ? `${cat.label} note already added` : `Add ${cat.label} note`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 7px',
                            borderRadius: 6,
                            border: `1px solid ${hasNote ? '#1e1e1e' : cat.border}`,
                            background: hasNote ? '#0a0a0a' : cat.bg,
                            cursor: hasNote ? 'not-allowed' : 'pointer',
                            opacity: hasNote ? 0.45 : 1,
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={e => {
                            if (!hasNote) {
                              (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}`;
                              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${cat.color}30`;
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.border = `1px solid ${hasNote ? '#1e1e1e' : cat.border}`;
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                          }}
                        >
                          <span style={{ fontSize: 12, lineHeight: 1 }}>{cat.icon}</span>
                          <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: hasNote ? '#555' : cat.color,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {cat.label}
                          </span>
                          {hasNote && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  height: 1,
                  background: 'linear-gradient(to right, transparent, #2a2a2a, transparent)',
                  margin: '6px 10px',
                }} />

                {/* CUT zone */}
                <div style={{ padding: '2px 6px 6px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 6px',
                    marginBottom: 4,
                  }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#f87171',
                      boxShadow: '0 0 6px rgba(248,113,113,0.5)',
                    }} />
                    <span style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#f87171',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Zone 2 — Cut
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 4,
                  }}>
                    {cutCats.map(cat => {
                      const hasNote = existingEditCats.has(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddEditNote(cat.id);
                          }}
                          disabled={hasNote}
                          title={hasNote ? `${cat.label} note already added` : `Add ${cat.label} note`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 7px',
                            borderRadius: 6,
                            border: `1px solid ${hasNote ? '#1e1e1e' : cat.border}`,
                            background: hasNote ? '#0a0a0a' : cat.bg,
                            cursor: hasNote ? 'not-allowed' : 'pointer',
                            opacity: hasNote ? 0.45 : 1,
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={e => {
                            if (!hasNote) {
                              (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}`;
                              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${cat.color}30`;
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.border = `1px solid ${hasNote ? '#1e1e1e' : cat.border}`;
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                          }}
                        >
                          <span style={{ fontSize: 12, lineHeight: 1 }}>{cat.icon}</span>
                          <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: hasNote ? '#555' : cat.color,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {cat.label}
                          </span>
                          {hasNote && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: '#1e1e1e', margin: '2px 0' }} />

      {/* ── Copy ── */}
      <div style={{ padding: '4px' }}>
        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: '#ccc',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1a1a1a'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy to Clipboard
        </button>

        {/* ── Delete ── */}
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.12s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
          Delete Shot
        </button>
      </div>
    </div>
  );
}
