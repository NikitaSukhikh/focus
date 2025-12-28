import React from 'react';

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
        className={`leading-relaxed ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
        }}
      >
        <div className="font-semibold">{firstTextLine}</div>
        {remainingText && (
          <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
            {remainingText}
          </div>
        )}
      </div>
    </div>
  );
}
