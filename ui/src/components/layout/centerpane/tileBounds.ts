import { detectFileType } from '../../../utils/fileTypes';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import {
  EMBED_LINK_HEIGHT,
  EMBED_LINK_WIDTH,
  NON_EMBED_LINK_SIZE,
  VIDEO_EMBED_HEIGHT,
  VIDEO_EMBED_WIDTH,
} from './tile/dimensionHelpers';
import { IconKind } from './types';

type TileBoundsPadding = { x: number; y: number };

const DEFAULT_FILE_TILE_SIZE = 128;

const VIDEO_LINK_PADDING: TileBoundsPadding = {
  x: Math.max(0, (EMBED_LINK_WIDTH - NON_EMBED_LINK_SIZE) / 2),
  y: Math.max(0, (EMBED_LINK_HEIGHT - NON_EMBED_LINK_SIZE) / 2),
};

const VIDEO_FILE_PADDING: TileBoundsPadding = {
  x: Math.max(0, (VIDEO_EMBED_WIDTH - DEFAULT_FILE_TILE_SIZE) / 2),
  y: Math.max(0, (VIDEO_EMBED_HEIGHT - DEFAULT_FILE_TILE_SIZE) / 2),
};

export const getVideoTilePadding = (
  type: IconKind,
  url?: string,
  filePath?: string
): TileBoundsPadding | null => {
  if (type === 'link' && getVideoEmbed(url)) {
    return VIDEO_LINK_PADDING;
  }

  if (type === 'file' && filePath && detectFileType(filePath).category === 'video') {
    return VIDEO_FILE_PADDING;
  }

  return null;
};
