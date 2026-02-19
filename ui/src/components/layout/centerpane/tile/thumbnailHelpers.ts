import { ImageMetadata } from '@/components/layout/centerpane/tile/useImageMetadata';
import { TILE } from '@/constants/objectsDimensions';

interface ThumbnailDimensionOptions {
  maxWidth?: number;
  maxHeight?: number;
}

function resolvePositiveSize(candidate: number | undefined, fallback: number): number {
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
}

export function getThumbnailDimensions(
  type: string,
  thumbnailUrl: string | null,
  imageMetadata: ImageMetadata | null,
  options?: ThumbnailDimensionOptions,
) {
  let thumbnailWidth = TILE.thumbnail.defaultSize;
  let thumbnailHeight = TILE.thumbnail.defaultSize;
  const constrainedMaxWidth = resolvePositiveSize(options?.maxWidth, TILE.thumbnail.maxSize);
  const constrainedMaxHeight = resolvePositiveSize(options?.maxHeight, TILE.thumbnail.maxSize);

  if (type === 'file' && thumbnailUrl && imageMetadata) {
    const widthScale = constrainedMaxWidth / imageMetadata.width;
    const heightScale = constrainedMaxHeight / imageMetadata.height;
    const scale = Math.min(widthScale, heightScale);

    if (Number.isFinite(scale) && scale > 0) {
      thumbnailWidth = Math.max(1, imageMetadata.width * scale);
      thumbnailHeight = Math.max(1, imageMetadata.height * scale);
    }
  } else if (type === 'file' && thumbnailUrl) {
    // Metadata can lag behind thumbnail load; still bind image box to current tile size.
    thumbnailWidth = constrainedMaxWidth;
    thumbnailHeight = constrainedMaxHeight;
  } else {
    thumbnailWidth = Math.min(TILE.thumbnail.defaultSize, constrainedMaxWidth);
    thumbnailHeight = Math.min(TILE.thumbnail.defaultSize, constrainedMaxHeight);
  }

  if (!Number.isFinite(thumbnailWidth) || thumbnailWidth <= 0) {
    thumbnailWidth = TILE.thumbnail.defaultSize;
  }
  if (!Number.isFinite(thumbnailHeight) || thumbnailHeight <= 0) {
    thumbnailHeight = TILE.thumbnail.defaultSize;
  }

  return { thumbnailWidth, thumbnailHeight };
}
