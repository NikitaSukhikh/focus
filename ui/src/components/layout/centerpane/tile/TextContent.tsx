// TextContent renders note tiles as a single continuous text surface without a separate header treatment.
import React from 'react';
import { TEXT_TILE } from '@/constants/objectsDimensions';
import { TEXT_NOTE_BOX, tileRingStyle, tileBackgroundFillStyle } from '@/styles/tileStyles';
import { formatTextWithLinksAndHighlight } from '@/utils/linkFormatter';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_WEIGHTS, TYPOGRAPHY_SIZES } from '@/styles/typographics';
import { useSearchStore } from '@/stores/searchStore';

interface TextContentProps {
  content: string;
  hoverScaleClass: string;
}

// TextContent keeps long notes readable in-place while preserving full-text drag behavior at the tile level.
export function TextContent({ content, hoverScaleClass }: TextContentProps) {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const textViewportMaxHeight = TEXT_TILE.maxHeight - (TEXT_NOTE_BOX.padding.y * 2);
  const textTileRightPadding = 0;

  return (
    <div
      className={`transition-transform duration-150 ${hoverScaleClass}`}
      style={{
        pointerEvents: 'auto',
        maxWidth: `${TEXT_TILE.maxWidth}px`,
        maxHeight: `${TEXT_TILE.maxHeight}px`,
        textAlign: 'left',
        position: 'relative',
        background: TEXT_NOTE_BOX.background,
        ...tileBackgroundFillStyle(TEXT_NOTE_BOX.background),
        paddingTop: `${TEXT_NOTE_BOX.padding.y}px`,
        paddingRight: `${textTileRightPadding}px`,
        paddingBottom: `${TEXT_NOTE_BOX.padding.y}px`,
        paddingLeft: `${TEXT_NOTE_BOX.padding.x}px`,
        ...tileRingStyle('text'),
      }}
    >
      <div
        className="whitespace-pre-wrap article-scroll"
        style={{
          fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
          fontSize: TYPOGRAPHY_SIZES.TEXT_TILE.fontSize,
          lineHeight: TYPOGRAPHY_SIZES.TEXT_TILE.lineHeight,
          color: 'var(--color-text-primary)',
          fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
          maxHeight: `${textViewportMaxHeight}px`,
          overflowY: 'auto',
          overflowX: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          boxSizing: 'border-box',
          paddingRight: '14px',
          paddingBottom: '6px',
        }}
      >
        {formatTextWithLinksAndHighlight(content || '', searchQuery)}
      </div>
    </div>
  );
}
