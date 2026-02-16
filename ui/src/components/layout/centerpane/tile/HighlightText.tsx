import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
}

// Splits text into plain and highlighted parts based on the search query.
export function HighlightText({ text, query }: HighlightTextProps) {
  if (!query.trim() || !text) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: '#facc15', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
