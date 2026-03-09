import { create } from 'zustand';
import type { Project, ProjectType } from '../types';
import * as dbOps from '../utils/db-operations';

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  isLoaded: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, type: ProjectType) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  incrementImageCount: (projectId: string) => void;
  decrementImageCount: (projectId: string) => void;
  updateThumbnail: (projectId: string, blobId: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProjectId: null,
  isLoaded: false,

  loadProjects: async () => {
    const projects = await dbOps.getAllProjects();
    set({ projects, isLoaded: true });
  },

  createProject: async (name, type) => {
    const project = await dbOps.createProject(name, type);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  deleteProject: async (id) => {
    await dbOps.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    }));
  },

  renameProject: async (id, name) => {
    const updatedAt = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt } : p
      ),
    }));
    const store = useProjectStore.getState();
    const project = store.projects.find((p) => p.id === id);
    if (project) await dbOps.updateProject(project);
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  incrementImageCount: (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, imageCount: p.imageCount + 1, updatedAt: Date.now() }
          : p
      ),
    }));
    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    if (project) dbOps.updateProject(project);
  },

  decrementImageCount: (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, imageCount: Math.max(0, p.imageCount - 1), updatedAt: Date.now() }
          : p
      ),
    }));
    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    if (project) dbOps.updateProject(project);
  },

  updateThumbnail: (projectId, blobId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, thumbnailBlobId: blobId } : p
      ),
    }));
    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    if (project) dbOps.updateProject(project);
  },
}));
