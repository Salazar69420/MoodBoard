import { useEffect } from 'react';
import { useImageStore } from '../stores/useImageStore';
import { useUIStore } from '../stores/useUIStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useBoardStore } from '../stores/useBoardStore';

export function useKeyboardShortcuts() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    if (!currentProjectId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const { selectedImageIds, clearSelection, hideContextMenu, activeTool, setActiveTool } = useUIStore.getState();
      const { removeImage } = useImageStore.getState();
      const { decrementImageCount } = useProjectStore.getState();
      const { cancelConnection } = useBoardStore.getState();

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') {
          setActiveTool('select');
          cancelConnection();
          return;
        }
        if (e.key === 'c' || e.key === 'C') {
          setActiveTool('connect');
          return;
        }
        if (e.key === 't' || e.key === 'T') {
          setActiveTool('text');
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImageIds.size > 0) {
          e.preventDefault();
          selectedImageIds.forEach(async (id) => {
            await removeImage(id);
            decrementImageCount(currentProjectId);
          });
          clearSelection();
          useUIStore.getState().showToast(
            selectedImageIds.size === 1 ? 'Image deleted' : `${selectedImageIds.size} images deleted`
          );
        }
      }

      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const images = useImageStore.getState().images;
        const allIds = new Set(images.map((i) => i.id));
        useUIStore.setState({ selectedImageIds: allIds });
      }

      if (e.key === 'Escape') {
        clearSelection();
        hideContextMenu();
        if (activeTool === 'connect') {
          cancelConnection();
          setActiveTool('select');
        } else if (activeTool === 'text') {
          setActiveTool('select');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectId]);
}

