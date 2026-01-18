import React from 'react';
import { TEXT_FONT_SIZE, TEXT_LINE_HEIGHT } from './dimensionHelpers';
import { formatTextWithLinks } from '../../../../utils/linkFormatter';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_WEIGHTS } from '../../../../styles/typographics';

interface TextContentProps {
  content: string;
  isSelected: boolean;
  hoverScaleClass: string;
}

// TextContent shows text note tiles, splitting the first line into a heading with the remaining body beneath it.
export function TextContent({ content, isSelected, hoverScaleClass }: TextContentProps) {
  const [firstTextLine, ...otherTextLines] = (content || '').split(/\r?\n/);
  const remainingText = otherTextLines.join('\n');

  return (
    <div
      className={`transition-transform duration-150 ${hoverScaleClass}`}
      style={{
        pointerEvents: 'none',
        maxWidth: '600px',
        textAlign: 'left',
      }}
    >
      <div
        className="leading-relaxed"
        style={{
          fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
          fontSize: `${TEXT_FONT_SIZE}px`,
          lineHeight: TEXT_LINE_HEIGHT,
          color: isSelected ? '#1d4ed8' : 'var(--color-text-primary)',
        }}
      >
        <div style={{ fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE }}>{formatTextWithLinks(firstTextLine)}</div>
        {remainingText && (
          <div
            className="whitespace-pre-wrap"
            style={{ lineHeight: TEXT_LINE_HEIGHT, fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION, color: 'var(--color-text-secondary)' }}
          >
            {formatTextWithLinks(remainingText)}
          </div>
        )}
      </div>
    </div>
  );
}
