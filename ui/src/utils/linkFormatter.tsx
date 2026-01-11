import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

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
              window.open(url, '_blank');
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
