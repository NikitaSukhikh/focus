import React from 'react';
import { TileIcon } from '@/components/layout/centerpane/tile/Icon';
import { ImageMetadata } from '@/components/layout/centerpane/tile/useImageMetadata';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '@/styles/typographics';
import { HighlightText } from '@/components/layout/centerpane/tile/HighlightText';
import { useSearchStore } from '@/stores/searchStore';

interface EbookMetadata {
  title: string;
  author: string | null;
}

interface DefaultContentProps {
  type: string;
  url?: string;
  filePath?: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  title: string;
  faviconUrl?: string;
  onThumbnailError: () => void;
  isSelected: boolean;
  hoverScaleClass: string;
  imageMetadata: ImageMetadata | null;
  ebookMetadata?: EbookMetadata | null;
}

// DefaultContent shows the generic tile body for files and miscellaneous integrations, including thumbnails and metadata.
export function DefaultContent({
  type,
  url,
  filePath,
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  title,
  faviconUrl,
  onThumbnailError,
  isSelected,
  hoverScaleClass,
  imageMetadata,
  ebookMetadata,
}: DefaultContentProps) {
  const showEbookInfo = ebookMetadata && (ebookMetadata.title || ebookMetadata.author);
  const searchQuery = useSearchStore((state) => state.searchQuery);
  return (
    <div className={`flex flex-col items-center transition-transform duration-150 ${hoverScaleClass}`} style={{ pointerEvents: 'none' }}>
      <div className={`text-slate-600 group-hover:text-blue-600 transition-all ${isSelected ? 'opacity-80' : ''}`}>
        <TileIcon
          type={type}
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
      {showEbookInfo ? (
        <>
          <div
            className="px-1 text-center mt-1 break-words"
            style={{
              width: '100%',
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
              color: 'var(--color-text-primary)',
            }}
          >
            <HighlightText text={ebookMetadata.title} query={searchQuery} />
          </div>
          {ebookMetadata.author && (
            <div
              className="text-center break-words"
              style={{
                fontFamily: TYPOGRAPHY_FONTS.TILE_DESCRIPTION,
                fontSize: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.fontSize,
                lineHeight: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.lineHeight,
                fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
                color: 'var(--color-text-muted)',
              }}
            >
              by <HighlightText text={ebookMetadata.author} query={searchQuery} />
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={`px-1 text-center mt-1 ${imageMetadata ? 'break-words' : title.length > 20 ? 'break-words' : 'truncate'}`}
            style={{
              width: imageMetadata ? `${thumbnailWidth}px` : '100%',
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
              color: 'var(--color-text-primary)',
            }}
          >
            <HighlightText text={title} query={searchQuery} />
          </div>
          {filePath && (
            <div
              className="text-center whitespace-pre-line break-words line-clamp-2"
              style={{
                width: imageMetadata ? `${thumbnailWidth}px` : '100%',
                fontFamily: TYPOGRAPHY_FONTS.TILE_DESCRIPTION,
                fontSize: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.fontSize,
                lineHeight: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.lineHeight,
                fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
                color: 'var(--color-text-muted)',
              }}
            >
              <HighlightText text={filePath} query={searchQuery} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
