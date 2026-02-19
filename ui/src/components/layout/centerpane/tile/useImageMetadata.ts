import { useState, useEffect } from 'react';
import { API_BASE } from '@/config/api';
import { canShowImageThumbnail } from '@/utils/fileTypes';

export interface ImageMetadata {
  width: number;
  height: number;
  aspect_ratio: string;
}

const imageMetadataCache = new Map<string, ImageMetadata>();

// useImageMetadata fetches image dimensions for file tiles so layout sizing and detail display can be accurate.
export function useImageMetadata(type: string, filePath?: string) {
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  useEffect(() => {
    if (!(type === 'file' && filePath && canShowImageThumbnail(filePath))) {
      setImageMetadata(null);
      return;
    }

    const cached = imageMetadataCache.get(filePath);
    if (cached) {
      setImageMetadata(cached);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ file_path: filePath });
    fetch(`${API_BASE}/thumbnails/metadata?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.width !== 'number' || typeof data.height !== 'number' || data.width <= 0 || data.height <= 0) {
          return;
        }
        const nextMetadata: ImageMetadata = {
          width: data.width,
          height: data.height,
          aspect_ratio: data.aspect_ratio,
        };
        imageMetadataCache.set(filePath, nextMetadata);
        setImageMetadata(nextMetadata);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[ICON TILE] Failed to fetch image metadata:', err);
        setImageMetadata(null);
      });

    return () => controller.abort();
  }, [type, filePath]);

  return { imageMetadata };
}
