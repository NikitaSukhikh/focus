import { ImageMetadata } from './useImageMetadata';

export const HOVER_SAFE_PADDING = 12;
export const EMBED_LINK_WIDTH = 360;
export const EMBED_LINK_HEIGHT = 240;
export const NON_EMBED_LINK_SIZE = 192;

export function getThumbnailDimensions(
  type: string,
  thumbnailUrl: string | null,
  imageMetadata: ImageMetadata | null
) {
  let thumbnailWidth = 96;
  let thumbnailHeight = 96;

  if (type === 'file' && thumbnailUrl && imageMetadata) {
    const aspectRatio = imageMetadata.width / imageMetadata.height;
    const maxSize = 144;

    if (aspectRatio > 1) {
      thumbnailWidth = maxSize;
      thumbnailHeight = maxSize / aspectRatio;
    } else if (aspectRatio < 1) {
      thumbnailHeight = maxSize;
      thumbnailWidth = maxSize * aspectRatio;
    } else {
      thumbnailWidth = maxSize;
      thumbnailHeight = maxSize;
    }
  }

  return { thumbnailWidth, thumbnailHeight };
}
