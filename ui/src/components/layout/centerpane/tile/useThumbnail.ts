import { useState, useEffect } from 'react';
import { API_BASE } from '@/config/api';
import { canShowImageThumbnail } from '@/utils/fileTypes';

export function useThumbnail(type: string, filePath?: string, title?: string) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Generates thumbnail URLs for image/file tiles and clears them for non-previewable items.
  useEffect(() => {
    console.log('[ICON TILE] Checking thumbnail for:', { type, filePath, title });
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      const params = new URLSearchParams({
        file_path: filePath,
        max_width: '256',
        max_height: '256',
        quality: '85',
      });
      const url = `${API_BASE}/thumbnails/image?${params.toString()}`;
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
