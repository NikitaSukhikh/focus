import React from 'react';
import { TEXT_FONT_SIZE, TEXT_LINE_HEIGHT } from './dimensionHelpers';

interface TextContentProps {
  content: string;
  isSelected: boolean;
  hoverScaleClass: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function formatTextWithLinks(text: string) {
  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={index}
          href={part}
          className="underline cursor-pointer"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            window.open(part, '_blank');
          }}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
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
        className={`leading-relaxed ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}
        style={{
          fontSize: `${TEXT_FONT_SIZE}px`,
          lineHeight: TEXT_LINE_HEIGHT,
        }}
      >
        <div className="font-semibold">{formatTextWithLinks(firstTextLine)}</div>
        {remainingText && (
          <div className="whitespace-pre-wrap" style={{ lineHeight: TEXT_LINE_HEIGHT }}>
            {formatTextWithLinks(remainingText)}
          </div>
        )}
      </div>
    </div>
  );
}
