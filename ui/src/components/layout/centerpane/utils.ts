import { TEXT_TILE } from '@/constants/objectsDimensions';

export const isGmailUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // Match mail.google.com, gmail.com, or accounts.google.com (for Gmail login)
    return (
      urlObj.hostname === 'mail.google.com' ||
      urlObj.hostname === 'gmail.com' ||
      (urlObj.hostname === 'accounts.google.com' && url.includes('mail'))
    );
  } catch {
    return false;
  }
};

const wrapLongWord = (word: string, limit: number): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < word.length; i += limit) {
    chunks.push(word.slice(i, i + limit));
  }
  return chunks;
};

const wrapLine = (line: string, limit: number): string[] => {
  if (line.length === 0) return [''];

  const parts: string[] = [];
  let current = '';

  for (const word of line.split(' ')) {
    if (word.length === 0) {
      // Preserve multiple spaces by adding as soon as possible
      if (current.length + 1 <= limit) {
        current += ' ';
      } else {
        parts.push(current);
        current = '';
      }
      continue;
    }

    if (word.length > limit) {
      if (current) {
        parts.push(current);
        current = '';
      }
      parts.push(...wrapLongWord(word, limit));
      continue;
    }

    if (!current.length) {
      current = word;
      continue;
    }

    if (current.length + 1 + word.length <= limit) {
      current += ` ${word}`;
    } else {
      parts.push(current);
      current = word;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

export const autoWrapText = (text: string, maxLineLength = TEXT_TILE.charLimit): string => {
  if (!text) return text;
  const limit = Math.max(1, maxLineLength);

  return text
    .split(/\r?\n/)
    .flatMap((line) => wrapLine(line, limit))
    .join('\n');
};
