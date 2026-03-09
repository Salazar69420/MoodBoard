import { useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useClipboardPaste } from '../../hooks/useClipboardPaste';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { BoardHeader } from './BoardHeader';
import { Canvas } from './Canvas';
import { ImageContextMenu } from './ImageContextMenu';
import { SettingsModal } from './SettingsModal';

export function BoardPage() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const loadImages = useImageStore((s) => s.loadImages);
  const isLoaded = useImageStore((s) => s.isLoaded);
  const loadBoard = useBoardStore((s) => s.loadBoard);

  useClipboardPaste();
  useKeyboardShortcuts();

  useEffect(() => {
    if (currentProjectId) {
      loadImages(currentProjectId);
      loadBoard(currentProjectId);
    }
  }, [currentProjectId, loadImages, loadBoard]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#555] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <BoardHeader />
      <Canvas />
      <ImageContextMenu />
      <SettingsModal />
    </div>
  );
}
