import React, { useRef, useState, useLayoutEffect } from 'react';
import { TEXT_TILE } from '../../../../constants/objectsDimensions';
import { formatTextWithLinks } from '../../../../utils/linkFormatter';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_WEIGHTS, TYPOGRAPHY_SIZES } from '../../../../styles/typographics';

interface TextContentProps {
  content: string;
  hoverScaleClass: string;
}

// TextContent shows text note tiles, splitting the first line into a heading with the remaining body beneath it.
// Text is folded to match video embed height with an ellipsis indicator when content overflows.
export function TextContent({ content, hoverScaleClass }: TextContentProps) {
  const [firstTextLine, ...otherTextLines] = (content || '').split(/\r?\n/);
  const remainingText = otherTextLines.join('\n');
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > TEXT_TILE.maxHeight);
    }
  }, [content]);

  return (
    <div
      className={`transition-transform duration-150 ${hoverScaleClass}`}
      style={{
        pointerEvents: 'none',
        maxWidth: `${TEXT_TILE.maxWidth}px`,
        textAlign: 'left',
        position: 'relative',
      }}
    >
      <div
        ref={contentRef}
        className="leading-relaxed"
        style={{
          fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
          fontSize: TYPOGRAPHY_SIZES.TEXT_TILE.fontSize,
          lineHeight: TYPOGRAPHY_SIZES.TEXT_TILE.lineHeight,
          color: 'var(--color-text-primary)',
          maxHeight: `${TEXT_TILE.maxHeight}px`,
          overflow: 'hidden',
        }}
      >
        <div style={{ fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE }}>{formatTextWithLinks(firstTextLine)}</div>
        {remainingText && (
          <div
            className="whitespace-pre-wrap"
            style={{ lineHeight: TYPOGRAPHY_SIZES.TEXT_TILE.lineHeight, fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION, color: 'var(--color-text-secondary)' }}
          >
            {formatTextWithLinks(remainingText)}
          </div>
        )}
      </div>
      {isOverflowing && (
        <div
          style={{
            marginTop: '2px',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              letterSpacing: '2px',
              color: 'var(--color-text-tertiary)',
              fontWeight: 600,
            }}
          >
            •••
          </span>
        </div>
      )}
    </div>
  );
}
