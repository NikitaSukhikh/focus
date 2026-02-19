import { TileIcon } from '@/components/layout/centerpane/tile/Icon';
import { ImageMetadata } from '@/components/layout/centerpane/tile/useImageMetadata';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '@/styles/typographics';
import { tileRingStyle, tileBackgroundFillStyle, TILE_BACKGROUND } from '@/styles/tileStyles';
import { GOOGLE_INTEGRATION_TILE } from '@/constants/objectsDimensions';
import { HighlightText } from '@/components/layout/centerpane/tile/HighlightText';
import { useSearchStore } from '@/stores/searchStore';
import { canShowImageThumbnail } from '@/utils/fileTypes';

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
  const isGoogleIntegration = type === 'gmail' || type === 'google_drive';
  const ringType = isGoogleIntegration ? 'link' : 'file';
  const isImageFile = type === 'file' && !!filePath && canShowImageThumbnail(filePath);
  const shouldShowImageRing = isImageFile && !!imageMetadata;

  if (isImageFile) {
    return (
      <div
        className={`transition-transform duration-150 ${hoverScaleClass}`}
        style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}
      >
        <div className={isSelected ? 'opacity-80' : ''}>
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
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            ...tileRingStyle('file'),
            outlineOffset: '0px',
            borderRadius: '6px',
            opacity: shouldShowImageRing ? 1 : 0,
            transition: 'opacity 150ms ease',
          }}
        />
      </div>
    );
  }

  if (isGoogleIntegration) {
    return (
      <div
        className={`flex flex-col items-center transition-transform duration-150 gap-1 px-1 ${hoverScaleClass}`}
        style={{ pointerEvents: 'none', width: '100%', height: '100%', background: TILE_BACKGROUND, ...tileBackgroundFillStyle(TILE_BACKGROUND), ...tileRingStyle(ringType) }}
      >
        <div className={isSelected ? 'drop-shadow-[0_4px_10px_rgba(59,130,246,0.25)]' : ''}>
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
            size={GOOGLE_INTEGRATION_TILE.iconSize}
          />
        </div>
        <div
          className="line-clamp-2 text-center break-words"
          style={{
            width: '100%',
            fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
            fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
            lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
            fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
            color: isSelected ? '#1d4ed8' : 'var(--color-text-primary)',
          }}
        >
          <HighlightText text={title} query={searchQuery} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-start transition-transform duration-150 ${hoverScaleClass}`}
      style={{ pointerEvents: 'none', width: '100%', height: '100%', background: TILE_BACKGROUND, ...tileBackgroundFillStyle(TILE_BACKGROUND), ...tileRingStyle(ringType) }}
    >
      {thumbnailUrl && (
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
      )}
      {showEbookInfo ? (
        <>
          <div
            className="px-1 flex items-start gap-1 mt-1 min-w-0"
            style={{
              width: '100%',
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
              color: 'var(--color-text-primary)',
            }}
          >
            {!thumbnailUrl && (
              <div className={`flex-shrink-0 text-slate-600 group-hover:text-blue-600 transition-all ${isSelected ? 'opacity-80' : ''}`}>
                <TileIcon
                  type={type}
                  url={url}
                  filePath={filePath}
                  thumbnailUrl={null}
                  thumbnailWidth={thumbnailWidth}
                  thumbnailHeight={thumbnailHeight}
                  title={title}
                  faviconUrl={faviconUrl}
                  onThumbnailError={onThumbnailError}
                  size={14}
                />
              </div>
            )}
            <div className="min-w-0 flex-1 break-all whitespace-pre-wrap line-clamp-2">
              <HighlightText text={ebookMetadata.title} query={searchQuery} />
            </div>
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
            className="px-1 flex items-start gap-1 mt-1 min-w-0"
            style={{
              width: '100%',
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
              color: 'var(--color-text-primary)',
            }}
          >
            {!thumbnailUrl && (
              <div className={`flex-shrink-0 text-slate-600 group-hover:text-blue-600 transition-all ${isSelected ? 'opacity-80' : ''}`}>
                <TileIcon
                  type={type}
                  url={url}
                  filePath={filePath}
                  thumbnailUrl={null}
                  thumbnailWidth={thumbnailWidth}
                  thumbnailHeight={thumbnailHeight}
                  title={title}
                  faviconUrl={faviconUrl}
                  onThumbnailError={onThumbnailError}
                  size={14}
                />
              </div>
            )}
            <div className={`min-w-0 flex-1 ${imageMetadata || title.length > 20 ? 'break-all whitespace-pre-wrap line-clamp-2' : 'truncate'}`}>
              <HighlightText text={title} query={searchQuery} />
            </div>
          </div>
          {filePath && (
            <div
              className="text-left whitespace-pre-line break-all line-clamp-2"
              style={{
                width: '100%',
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
