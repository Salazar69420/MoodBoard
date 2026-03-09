import { create } from 'zustand';
import type { BoardImage } from '../types';
import * as dbOps from '../utils/db-operations';
import { revokeBlobUrl } from '../utils/image';

interface ImageStore {
  images: BoardImage[];
  isLoaded: boolean;

  loadImages: (projectId: string) => Promise<void>;
  addImage: (image: BoardImage) => void;
  removeImage: (imageId: string) => Promise<void>;
  updatePosition: (imageId: string, x: number, y: number) => void;
  updateSize: (imageId: string, displayWidth: number, displayHeight: number) => void;
  persistPosition: (imageId: string) => Promise<void>;
  updateLabel: (imageId: string, label: string) => Promise<void>;
  clear: () => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  isLoaded: false,

  loadImages: async (projectId) => {
    const images = await dbOps.getImagesByProject(projectId);
    set({ images, isLoaded: true });
  },

  addImage: (image) => {
    set((state) => ({ images: [...state.images, image] }));
  },

  removeImage: async (imageId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (!image) return;
    revokeBlobUrl(image.blobId);
    await dbOps.deleteImage(imageId, image.blobId);
    set((state) => ({ images: state.images.filter((i) => i.id !== imageId) }));
  },

  updatePosition: (imageId, x, y) => {
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, x, y } : i
      ),
    }));
  },

  updateSize: (imageId, displayWidth, displayHeight) => {
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, displayWidth, displayHeight } : i
      ),
    }));
  },

  persistPosition: async (imageId) => {
    const image = get().images.find((i) => i.id === imageId);
    if (image) {
      await dbOps.updateImagePosition(imageId, image.x, image.y);
    }
  },

  updateLabel: async (imageId, label) => {
    await dbOps.updateImageLabel(imageId, label);
    set((state) => ({
      images: state.images.map((i) =>
        i.id === imageId ? { ...i, label } : i
      ),
    }));
  },

  clear: () => set({ images: [], isLoaded: false }),
}));
