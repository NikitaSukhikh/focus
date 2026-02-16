import React from 'react';
import { TileIcon } from '@/components/layout/centerpane/tile/Icon';
import { truncateDisplayUrl } from '@/utils/text';
import { isGoogleService } from '@/components/layout/centerpane/tile/iconHelpers';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '@/styles/typographics';
import { HighlightText } from '@/components/layout/centerpane/tile/HighlightText';
import { useSearchStore } from '@/stores/searchStore';

interface LinkContentProps {
  url?: string;
  filePath?: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  title: string;
  description?: string;
  faviconUrl?: string;
  onThumbnailError: () => void;
  isSelected: boolean;
  hoverScaleClass: string;
}

// LinkContent renders the visual card for link tiles, handling favicon/thumbnail display.
export function LinkContent({
  url,
  filePath,
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  title,
  description,
  faviconUrl,
  onThumbnailError,
  isSelected,
  hoverScaleClass,
}: LinkContentProps) {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  return (
    <div
      className={`w-full h-full transition-transform duration-150 flex flex-col items-center justify-center gap-2 px-1 ${hoverScaleClass}`}
      style={{ pointerEvents: 'none' }}
    >
      <div className={`flex-shrink-0 ${isSelected ? 'drop-shadow-[0_4px_10px_rgba(59,130,246,0.25)]' : ''}`}>
        <TileIcon
          type="link"
          url={url}
          filePath={filePath}
          thumbnailUrl={thumbnailUrl}
          thumbnailWidth={thumbnailWidth}
          thumbnailHeight={thumbnailHeight}
          title={title}
          faviconUrl={faviconUrl}
          onThumbnailError={onThumbnailError}
        />
      </div>
      <div className="w-full min-w-0 flex flex-col items-center gap-1">
        <>
          <div
            className="line-clamp-2 text-center"
            style={{
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
              color: isSelected ? '#1d4ed8' : 'var(--color-text-primary)',
            }}
          >
            <HighlightText text={title} query={searchQuery} />
          </div>
          {description && (
            <div
              className="line-clamp-3 mt-0.5 text-center whitespace-pre-line"
              style={{
                fontFamily: TYPOGRAPHY_FONTS.TILE_DESCRIPTION,
                fontSize: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.fontSize,
                lineHeight: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.lineHeight,
                fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
                color: 'var(--color-text-muted)',
              }}
            >
              <HighlightText text={description} query={searchQuery} />
            </div>
          )}
          {url && !isGoogleService(url) && (
            <div
              className="mt-1 text-center whitespace-pre-line break-words line-clamp-2"
              style={{
                fontFamily: TYPOGRAPHY_FONTS.TILE_DESCRIPTION,
                fontSize: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.fontSize,
                lineHeight: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.lineHeight,
                fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
                color: isSelected ? '#3b82f6' : 'var(--color-text-muted)',
              }}
            >
              <HighlightText text={truncateDisplayUrl(url)} query={searchQuery} />
            </div>
          )}
        </>
      </div>
    </div>
  );
}
