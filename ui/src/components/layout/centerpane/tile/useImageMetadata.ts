import { useState, useEffect } from 'react';
import { canShowImageThumbnail } from '../../../../utils/fileTypes';

export interface ImageMetadata {
  width: number;
  height: number;
  aspect_ratio: string;
}

export function useImageMetadata(type: string, filePath?: string) {
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  useEffect(() => {
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      const params = new URLSearchParams({ file_path: filePath });
      fetch(`/api/thumbnails/metadata?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setImageMetadata({
            width: data.width,
            height: data.height,
            aspect_ratio: data.aspect_ratio,
          });
        })
        .catch(err => {
          console.error('[ICON TILE] Failed to fetch image metadata:', err);
          setImageMetadata(null);
        });
    } else {
      setImageMetadata(null);
    }
  }, [type, filePath]);

  return { imageMetadata };
}
