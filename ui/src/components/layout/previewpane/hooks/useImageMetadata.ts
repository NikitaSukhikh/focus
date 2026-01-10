import { useState, useEffect } from 'react';
import { API_BASE } from '../../../../config/api';

export interface ImageMetadata {
  width: number;
  height: number;
  aspect_ratio: string;
  file_size: number;
  file_size_human: string;
}

// useImageMetadata fetches basic dimensions and size info for image files so previews can display details alongside the image.
export function useImageMetadata(isImageFile: boolean, filePath?: string): ImageMetadata | null {
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  useEffect(() => {
    if (isImageFile && filePath) {
      const params = new URLSearchParams({ file_path: filePath });
      fetch(`${API_BASE}/thumbnails/metadata?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setImageMetadata(data);
        })
        .catch(err => {
          console.error('[PreviewPane] Failed to fetch image metadata:', err);
          setImageMetadata(null);
        });
    } else {
      setImageMetadata(null);
    }
  }, [isImageFile, filePath]);

  return imageMetadata;
}
