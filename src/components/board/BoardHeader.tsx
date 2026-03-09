import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { TypeBadge } from '../shared/TypeBadge';

function ImageCount({ fallbackCount }: { fallbackCount: number }) {
  const loadedImages = useImageStore((s) => s.images);
  const isLoaded = useImageStore((s) => s.isLoaded);
  const count = isLoaded ? loadedImages.length : fallbackCount;
  return (
    <span className="text-[10px] text-[#555] ml-auto">
      {count} {count === 1 ? 'image' : 'images'}
    </span>
  );
}

export function BoardHeader() {
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const clearImages = useImageStore((s) => s.clear);
  const images = useImageStore((s) => s.images);
  const toggleSettings = useSettingsStore((s) => s.toggleSettings);
  const hasApiKey = useSettingsStore((s) => !!s.apiKey);
  const autoArrangeNotes = useBoardStore((s) => s.autoArrangeNotes);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const boardMode = useBoardStore((s) => s.boardMode);
  const setBoardMode = useBoardStore((s) => s.setBoardMode);

  const project = projects.find((p) => p.id === currentProjectId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isArranging, setIsArranging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!project) return null;

  const handleBack = () => {
    clearImages();
    setCurrentProject(null);
  };

  const startEditing = () => {
    setEditName(project.name);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== project.name) {
      renameProject(project.id, trimmed);
    }
    setIsEditing(false);
  };

  const hasNotes = categoryNotes.length > 0 || editNotes.length > 0;

  const handleAutoArrange = async () => {
    if (!hasNotes || isArranging) return;
    setIsArranging(true);
    await autoArrangeNotes(images);
    setTimeout(() => setIsArranging(false), 600);
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0 z-10"
      style={{
        background: 'rgba(8,8,12,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <button
        onClick={handleBack}
        className="transition-colors"
        style={{
          color: '#666',
          padding: '5px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = '#e5e5e5';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.color = '#666';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(249,115,22,0.4)',
            borderRadius: '8px',
            padding: '3px 8px',
            fontSize: '13px',
            color: '#e5e5e5',
            outline: 'none',
            backdropFilter: 'blur(8px)',
          }}
        />
      ) : (
        <h2
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#d0d0d0',
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
          onDoubleClick={startEditing}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#d0d0d0'}
          title="Double-click to rename"
        >
          {project.name}
        </h2>
      )}

      <TypeBadge type={project.type} size="xs" />

      <ImageCount fallbackCount={project.imageCount} />

      {/* Auto-arrange button */}
      {hasNotes && (
        <button
          onClick={handleAutoArrange}
          disabled={isArranging}
          title="Minimize & arrange all notes next to their images"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            background: isArranging
              ? 'rgba(249,115,22,0.15)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isArranging ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: isArranging ? '#f97316' : '#888',
            cursor: isArranging ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            if (!isArranging) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.3)';
              (e.currentTarget as HTMLElement).style.color = '#f97316';
            }
          }}
          onMouseLeave={e => {
            if (!isArranging) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.color = '#888';
            }
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              animation: isArranging ? 'spin 0.8s linear infinite' : 'none',
            }}
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>{isArranging ? 'Arranging…' : 'Auto-arrange'}</span>
        </button>
      )}

      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '2px',
        gap: '2px',
        backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={() => setBoardMode('i2v')}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: boardMode === 'i2v' ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: boardMode === 'i2v' ? '#f97316' : '#666',
            border: 'none',
          }}
        >
          I2V
        </button>
        <button
          onClick={() => setBoardMode('edit')}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: boardMode === 'edit' ? 'rgba(34,211,238,0.15)' : 'transparent',
            color: boardMode === 'edit' ? '#22d3ee' : '#666',
            border: 'none',
          }}
        >
          Edit
        </button>
      </div>

      {/* Settings gear */}
      <button
        onClick={toggleSettings}
        title="Settings"
        style={{
          position: 'relative',
          padding: '5px',
          borderRadius: '10px',
          background: hasApiKey ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasApiKey ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = hasApiKey ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = hasApiKey ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)';
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hasApiKey ? '#f97316' : '#666'}
          strokeWidth="2"
          style={{ transition: 'stroke 0.15s ease' }}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {hasApiKey && (
          <div style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px rgba(74,222,128,0.7)',
          }} />
        )}
      </button>
    </div>
  );
}
