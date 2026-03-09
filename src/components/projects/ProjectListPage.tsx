import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';
import { importProject } from '../../utils/export-import';
import { useRef } from 'react';

export function ProjectListPage() {
  const projects = useProjectStore((s) => s.projects);
  const isCreatingProject = useUIStore((s) => s.isCreatingProject);
  const setCreatingProject = useUIStore((s) => s.setCreatingProject);
  const showToast = useUIStore((s) => s.showToast);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Importing project...');
      await importProject(file);
      await loadProjects();
      showToast('Project imported successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to import project');
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#07080e' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'rgba(8,9,16,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e4f0', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
            AIM MEDIA MOOD BOARD
          </h1>
          <p style={{ fontSize: '11px', color: '#555a70', marginTop: '2px' }}>
            AI Video Generation Assistant
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setCreatingProject(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              background: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.28)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241, 0.5)';
              (e.currentTarget as HTMLElement).style.color = '#c7d2fe';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.18)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99, 102, 241, 0.35)';
              (e.currentTarget as HTMLElement).style.color = '#a5b4fc';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Project grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {projects.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', textAlign: 'center',
          }}>
            <div style={{ color: '#2a2d3e', marginBottom: '16px' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#474d62', marginBottom: '6px' }}>No projects yet</h2>
            <p style={{ fontSize: '13px', color: '#373c50', marginBottom: '20px' }}>
              Create a project to start organizing your AI generations
            </p>
            <button
              onClick={() => setCreatingProject(true)}
              style={{
                padding: '9px 20px',
                background: 'rgba(99, 102, 241, 0.18)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#a5b4fc',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.28)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.18)'; }}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {isCreatingProject && <NewProjectDialog />}
    </div>
  );
}
