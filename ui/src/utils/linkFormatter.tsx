import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

function highlightPlainText(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ background: '#facc15', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export function formatTextWithLinksAndHighlight(text: string, query: string, className?: string) {
  const urlParts = text.split(URL_REGEX);
  let keyCounter = 0;
  return urlParts.map((part) => {
    const key = keyCounter++;
    if (part.match(URL_REGEX)) {
      const url = part.startsWith('http://') || part.startsWith('https://')
        ? part
        : `https://${part}`;
      return (
        <a
          key={key}
          href={url}
          className={className || 'text-blue-600 underline cursor-pointer'}
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.desktopAPI?.openExternal) {
              window.desktopAPI.openExternal(url);
            } else {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
        >
          {query.trim() ? highlightPlainText(part, query) : part}
        </a>
      );
    }
    return <React.Fragment key={key}>{highlightPlainText(part, query)}</React.Fragment>;
  });
}

export function formatTextWithLinks(text: string, className?: string) {
  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      const url = part.startsWith('http://') || part.startsWith('https://')
        ? part
        : `https://${part}`;

      return (
        <a
          key={index}
          href={url}
          className={className || 'text-blue-600 underline cursor-pointer'}
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.desktopAPI?.openExternal) {
              window.desktopAPI.openExternal(url);
            } else {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
