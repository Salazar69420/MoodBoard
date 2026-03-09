import { useEffect } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { Layout } from './Layout';
import { ProjectListPage } from './projects/ProjectListPage';
import { BoardPage } from './board/BoardPage';

export function App() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const isLoaded = useProjectStore((s) => s.isLoaded);
  const loadProjects = useProjectStore((s) => s.loadProjects);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (!isLoaded) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-[#555] text-sm">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {currentProjectId ? <BoardPage /> : <ProjectListPage />}
    </Layout>
  );
}
