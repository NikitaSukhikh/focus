import { useMemo } from 'react';

export function useTextPreview(
  type?: string,
  content?: string,
  title?: string
): string | undefined {
  // Strips redundant title lines from note content when the text tile title already matches the first line.
  return useMemo(() => {
    if (type !== 'text' || !content) return content;

    const lines = content.split(/\r?\n/);
    if (!lines.length) return content;

    const firstLine = lines[0].trim();
    const normalizedTitle = (title || '').trim();
    const titleMatchesFirstLine =
      normalizedTitle &&
      (firstLine.toLowerCase() === normalizedTitle.toLowerCase() ||
        firstLine.toLowerCase().startsWith(normalizedTitle.toLowerCase()) ||
        normalizedTitle.toLowerCase().startsWith(firstLine.toLowerCase()));

    if (titleMatchesFirstLine) {
      return lines.slice(1).join('\n').replace(/^\n*/, '');
    }

    return content;
  }, [type, content, title]);
}
