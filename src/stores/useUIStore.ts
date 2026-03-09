import { create } from 'zustand';

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  targetImageId: string | null;
}

interface UIStore {
  selectedImageIds: Set<string>;
  contextMenu: ContextMenu;
  isCreatingProject: boolean;
  toastMessage: string | null;
  toastTimeout: ReturnType<typeof setTimeout> | null;
  activeTool: 'select' | 'connect' | 'text';

  selectImage: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  showContextMenu: (x: number, y: number, imageId: string) => void;
  hideContextMenu: () => void;
  setCreatingProject: (v: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setActiveTool: (tool: 'select' | 'connect' | 'text') => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  selectedImageIds: new Set<string>(),
  contextMenu: { visible: false, x: 0, y: 0, targetImageId: null },
  isCreatingProject: false,
  toastMessage: null,
  toastTimeout: null,
  activeTool: 'select',

  setActiveTool: (tool) => set({ activeTool: tool }),

  selectImage: (id, multi = false) => {
    set((state) => {
      const next = new Set(multi ? state.selectedImageIds : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedImageIds: next };
    });
  },

  clearSelection: () => set({ selectedImageIds: new Set() }),

  showContextMenu: (x, y, imageId) => {
    set({ contextMenu: { visible: true, x, y, targetImageId: imageId } });
  },

  hideContextMenu: () => {
    set({ contextMenu: { visible: false, x: 0, y: 0, targetImageId: null } });
  },

  setCreatingProject: (v) => set({ isCreatingProject: v }),

  showToast: (message) => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    const timeout = setTimeout(() => {
      set({ toastMessage: null, toastTimeout: null });
    }, 2500);
    set({ toastMessage: message, toastTimeout: timeout });
  },

  hideToast: () => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    set({ toastMessage: null, toastTimeout: null });
  },
}));
