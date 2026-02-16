import { ImageMetadata } from '@/components/layout/centerpane/tile/useImageMetadata';
import { TILE } from '@/constants/objectsDimensions';

export function getThumbnailDimensions(
  type: string,
  thumbnailUrl: string | null,
  imageMetadata: ImageMetadata | null
) {
  let thumbnailWidth = TILE.thumbnail.defaultSize;
  let thumbnailHeight = TILE.thumbnail.defaultSize;

  if (type === 'file' && thumbnailUrl && imageMetadata) {
    const aspectRatio = imageMetadata.width / imageMetadata.height;
    const maxSize = TILE.thumbnail.maxSize;

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
