import { getBlob } from './db-operations';

export async function copyImageToClipboard(blobId: string): Promise<boolean> {
  try {
    const blob = await getBlob(blobId);
    if (!blob) return false;

    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      pngBlob = await convertToPng(blob);
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
    return true;
  } catch (err) {
    console.error('Failed to copy image:', err);
    return false;
  }
}

async function convertToPng(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert to PNG'));
    }, 'image/png');
  });
}
