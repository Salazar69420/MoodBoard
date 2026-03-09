import { useState } from 'react';
import type { Project } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { TypeBadge } from '../shared/TypeBadge';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { exportProject } from '../../utils/export-import';

export function ProjectCard({ project }: { project: Project }) {
  const [showDelete, setShowDelete] = useState(false);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const showToast = useUIStore((s) => s.showToast);
  const thumbnailUrl = useBlobUrl(project.thumbnailBlobId);

  const handleDelete = async () => {
    await deleteProject(project.id);
    showToast('Project deleted');
    setShowDelete(false);
  };

  const timeAgo = getTimeAgo(project.updatedAt);

  return (
    <>
      <div
        className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer hover:border-[#444] transition-all hover:shadow-lg hover:shadow-black/20"
        onClick={() => setCurrentProject(project.id)}
      >
        {/* Thumbnail */}
        <div className="aspect-video bg-[#111] overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#333]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-[#e5e5e5] truncate mb-1.5">{project.name}</h3>
          <div className="flex items-center justify-between">
            <TypeBadge type={project.type} size="xs" />
            <span className="text-[10px] text-[#666]">
              {project.imageCount} {project.imageCount === 1 ? 'image' : 'images'} · {timeAgo}
            </span>
          </div>
        </div>

        {/* Export and Delete buttons container */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Export button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                showToast('Exporting project...');
                await exportProject(project.id);
                showToast('Project exported successfully');
              } catch (err) {
                console.error(err);
                showToast('Failed to export project');
              }
            }}
            className="bg-black/60 hover:bg-blue-500/30 text-[#888] hover:text-blue-400 rounded-lg p-1.5 transition-all"
            title="Export Project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="bg-black/60 hover:bg-red-500/30 text-[#888] hover:text-red-400 rounded-lg p-1.5 transition-all"
            title="Delete Project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${project.name}" and all its images? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
