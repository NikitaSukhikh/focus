// Builds the best available image source for file tiles so resized tiles keep visual quality.
import { useState, useEffect } from 'react';
import { API_BASE } from '@/config/api';
import { canShowImageThumbnail } from '@/utils/fileTypes';

export function useThumbnail(type: string, filePath?: string, title?: string) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Use full-size image endpoint so tile resizing stays sharp instead of upscaling a low-res thumbnail.
  useEffect(() => {
    console.log('[ICON TILE] Checking thumbnail for:', { type, filePath, title });
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      const params = new URLSearchParams({ file_path: filePath });
      const url = `${API_BASE}/thumbnails/full-image?${params.toString()}`;
      console.log('[ICON TILE] Setting thumbnail URL:', url);
      setThumbnailUrl(url);
    } else {
      console.log('[ICON TILE] No thumbnail needed:', {
        isFile: type === 'file',
        hasFilePath: !!filePath,
        canShowThumbnail: filePath ? canShowImageThumbnail(filePath) : false
      });
      setThumbnailUrl(null);
    }
  }, [type, filePath, title]);

  return { thumbnailUrl, setThumbnailUrl };
}
