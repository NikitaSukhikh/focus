// Builds the best available image source for file tiles so resized tiles keep visual quality.
import { useState, useEffect } from 'react';
import { API_BASE } from '@/config/api';
import { canShowImageThumbnail } from '@/utils/fileTypes';

const FULL_IMAGE_ASPECT_RATIO_BY_FILE = new Map<string, number>();

function buildFullImageUrl(filePath: string): string {
  const params = new URLSearchParams({ file_path: filePath });
  return `${API_BASE}/thumbnails/full-image?${params.toString()}`;
}

async function fetchImageAspectRatio(filePath: string, signal: AbortSignal): Promise<number | null> {
  const params = new URLSearchParams({ file_path: filePath });
  const response = await fetch(`${API_BASE}/thumbnails/metadata?${params.toString()}`, { signal });
  if (!response.ok) return null;
  const data = await response.json();
  const width = typeof data.width === 'number' ? data.width : NaN;
  const height = typeof data.height === 'number' ? data.height : NaN;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return width / height;
}

export function useThumbnail(type: string, filePath?: string) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState<number | null>(null);

  // Use full image directly (no thumbnail endpoint), while keeping ratio available for layout.
  useEffect(() => {
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      const fullImageUrl = buildFullImageUrl(filePath);
      const cachedAspectRatio = FULL_IMAGE_ASPECT_RATIO_BY_FILE.get(filePath);
      if (typeof cachedAspectRatio === 'number' && Number.isFinite(cachedAspectRatio) && cachedAspectRatio > 0) {
        setThumbnailAspectRatio(cachedAspectRatio);
        setThumbnailUrl(fullImageUrl);
        return;
      }

      setThumbnailUrl(null);
      const controller = new AbortController();
      void (async () => {
        try {
          const ratio = await fetchImageAspectRatio(filePath, controller.signal);
          if (ratio && Number.isFinite(ratio) && ratio > 0) {
            FULL_IMAGE_ASPECT_RATIO_BY_FILE.set(filePath, ratio);
            setThumbnailAspectRatio(ratio);
          }
        } catch (error) {
          if (!(error instanceof Error && error.name === 'AbortError')) {
            console.error('[ICON TILE] Failed to fetch image aspect ratio:', error);
          }
        } finally {
          if (!controller.signal.aborted) {
            setThumbnailUrl(fullImageUrl);
          }
        }
      })();

      return () => {
        controller.abort();
      };
    } else {
      setThumbnailUrl(null);
      setThumbnailAspectRatio(null);
    }
  }, [type, filePath]);

  return { thumbnailUrl, setThumbnailUrl, thumbnailAspectRatio };
}
