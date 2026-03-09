import { useState } from 'react';
import type { ProjectType } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';

const projectTypes: { value: ProjectType; label: string; color: string }[] = [
  { value: 'mood-board', label: 'Mood Board', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { value: 'storyboard', label: 'Storyboard', color: 'border-green-500 bg-green-500/10 text-green-400' },
  { value: 'first-frames', label: 'First Frames', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
];

export function NewProjectDialog() {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('mood-board');
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setCreatingProject = useUIStore((s) => s.setCreatingProject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const project = await createProject(trimmed, type);
    setCurrentProject(project.id);
    setCreatingProject(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" onClick={() => setCreatingProject(false)}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-[#e5e5e5] mb-5">New Project</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm text-[#888] mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My project..."
              autoFocus
              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-[#e5e5e5] text-sm placeholder-[#555] focus:outline-none focus:border-[#6366f1] transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[#888] mb-2">Project Type</label>
            <div className="grid grid-cols-3 gap-2">
              {projectTypes.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setType(pt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    type === pt.value
                      ? pt.color
                      : 'border-[#333] bg-transparent text-[#888] hover:border-[#555]'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreatingProject(false)}
              className="px-4 py-2 text-sm text-[#888] hover:text-[#e5e5e5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-sm bg-[#6366f1] hover:bg-[#818cf8] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
