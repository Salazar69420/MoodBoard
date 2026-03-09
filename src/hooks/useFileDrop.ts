import { useEffect, type RefObject } from 'react';
import { nanoid } from 'nanoid';
import type { BoardImage } from '../types';
import { getImageDimensions } from '../utils/image';
import { storeImage, storeBlob } from '../utils/db-operations';
import { useImageStore } from '../stores/useImageStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';

export function useFileDrop(containerRef: RefObject<HTMLDivElement | null>) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !currentProjectId) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files) return;

      const dropX = e.clientX;
      const dropY = e.clientY;
      let offsetIndex = 0;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const { width, height } = await getImageDimensions(file);
        const imageId = nanoid();
        const blobId = nanoid();

        const x = dropX + offsetIndex * 30 - 100;
        const y = dropY + offsetIndex * 30 - 100;
        offsetIndex++;

        const boardImage: BoardImage = {
          id: imageId,
          projectId: currentProjectId,
          blobId,
          filename: file.name || `dropped-${Date.now()}.png`,
          mimeType: file.type,
          width,
          height,
          x,
          y,
          label: '',
          createdAt: Date.now(),
        };

        await storeBlob(blobId, file);
        await storeImage(boardImage);

        useImageStore.getState().addImage(boardImage);
        useProjectStore.getState().incrementImageCount(currentProjectId);

        const project = useProjectStore.getState().projects.find(
          (p) => p.id === currentProjectId
        );
        if (project && !project.thumbnailBlobId) {
          useProjectStore.getState().updateThumbnail(currentProjectId, blobId);
        }
      }

      if (offsetIndex > 0) {
        useUIStore.getState().showToast(
          offsetIndex === 1 ? 'Image added' : `${offsetIndex} images added`
        );
      }
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [containerRef, currentProjectId]);
}
