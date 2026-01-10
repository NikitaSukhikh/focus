import { ImageMetadata } from './useImageMetadata';

export const HOVER_SAFE_PADDING = 12;
export const EMBED_LINK_WIDTH = 360;
export const EMBED_LINK_HEIGHT = 260;
export const NON_EMBED_LINK_SIZE = 192;
export const AUDIO_EMBED_WIDTH = 360;
export const AUDIO_EMBED_HEIGHT = 210;
export const VIDEO_EMBED_WIDTH = 360;
export const VIDEO_EMBED_HEIGHT = 260; // 16:9 video (202.5px) + title area (40px) + gap (12px)

// Text/Note dimensions
export const TEXT_WIDTH = 360; // Match video embed width
export const TEXT_FONT_SIZE = 16; // Font size in pixels
export const TEXT_FONT_WEIGHT = 500; // Medium weight
export const TEXT_LINE_HEIGHT = 1.6; // Line height multiplier
// Calculate character limit based on width (assuming ~9px per character)
export const TEXT_CHAR_LIMIT = Math.floor(TEXT_WIDTH / 9);

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
