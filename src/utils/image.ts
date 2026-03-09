import { getBlob } from './db-operations';

const urlCache = new Map<string, string>();

export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function getBlobUrl(blobId: string): Promise<string | null> {
  const cached = urlCache.get(blobId);
  if (cached) return cached;

  const blob = await getBlob(blobId);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  urlCache.set(blobId, url);
  return url;
}

export function revokeBlobUrl(blobId: string) {
  const url = urlCache.get(blobId);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(blobId);
  }
}

export function getCachedBlobUrl(blobId: string): string | null {
  return urlCache.get(blobId) ?? null;
}
