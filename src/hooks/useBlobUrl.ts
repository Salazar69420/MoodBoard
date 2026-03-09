import { useState, useEffect } from 'react';
import { getBlobUrl, getCachedBlobUrl } from '../utils/image';

export function useBlobUrl(blobId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(
    blobId ? getCachedBlobUrl(blobId) : null
  );

  useEffect(() => {
    if (!blobId) {
      setUrl(null);
      return;
    }

    const cached = getCachedBlobUrl(blobId);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    getBlobUrl(blobId).then((result) => {
      if (!cancelled) setUrl(result);
    });

    return () => {
      cancelled = true;
    };
  }, [blobId]);

  return url;
}
