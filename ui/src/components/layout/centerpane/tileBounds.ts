import { detectFileType } from '../../../utils/fileTypes';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { TILE, EMBED_LINK, NON_EMBED_LINK, VIDEO_EMBED } from '../../../constants/objectsDimensions';
import { IconKind } from './types';

type TileBoundsPadding = { x: number; y: number };

const VIDEO_LINK_PADDING: TileBoundsPadding = {
  x: Math.max(0, (EMBED_LINK.width - NON_EMBED_LINK.size) / 2),
  y: Math.max(0, (EMBED_LINK.height - NON_EMBED_LINK.size) / 2),
};

const VIDEO_FILE_PADDING: TileBoundsPadding = {
  x: Math.max(0, (VIDEO_EMBED.width - TILE.defaultFileTileSize) / 2),
  y: Math.max(0, (VIDEO_EMBED.height - TILE.defaultFileTileSize) / 2),
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
