// TextContent renders note tiles as a single continuous text surface without a separate header treatment.
import { useEffect, useRef } from 'react';
import { TEXT_NOTE_BOX, tileRingStyle, tileBackgroundFillStyle } from '@/styles/tileStyles';
import { formatTextWithLinksAndHighlight } from '@/utils/linkFormatter';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_WEIGHTS, TYPOGRAPHY_SIZES } from '@/styles/typographics';
import { useSearchStore } from '@/stores/searchStore';

interface TextContentProps {
  content: string;
  hoverScaleClass: string;
  onMinWidthChange?: (_minWidth: number) => void;
}

// TextContent keeps long notes readable in-place while leaving drag affordance to dedicated handle hit areas.
export function TextContent({ content, hoverScaleClass, onMinWidthChange }: TextContentProps) {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const textTileRightPadding = 0;
  const contentRef = useRef<HTMLDivElement>(null);
  const isSingleLineText = !content.includes('\n');

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const notify = () => {
      const minWidth = Math.ceil(
        el.scrollWidth
        + (TEXT_NOTE_BOX.padding.x * 2)
        + textTileRightPadding
        + 14 // text viewport right inset
      );
      onMinWidthChange?.(Math.max(1, minWidth));
    };

    notify();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', notify);
      return () => window.removeEventListener('resize', notify);
    }

    const observer = new ResizeObserver(() => notify());
    observer.observe(el);
    return () => observer.disconnect();
  }, [onMinWidthChange, searchQuery, textTileRightPadding, content]);

  return (
    <div
      className={`transition-transform duration-150 ${hoverScaleClass}`}
      style={{
        pointerEvents: 'auto',
        textAlign: 'left',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        className="article-scroll"
        style={{
          // Single-line notes don't benefit from vertical scrolling and can show a redundant Y scrollbar when collapsed.
          overflowY: isSingleLineText ? 'hidden' : 'auto',
          overflowX: 'auto',
          cursor: 'default',
          userSelect: 'none',
          boxSizing: 'border-box',
          paddingRight: '14px',
          paddingBottom: '6px',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          ref={contentRef}
          className="whitespace-pre"
          style={{
            display: 'inline-block',
            width: 'max-content',
            fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
            fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
            lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
            color: 'var(--color-text-primary)',
            fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
          }}
        >
          {formatTextWithLinksAndHighlight(content || '', searchQuery)}
        </div>
      </div>
    </div>
  );
}
