export const MAX_LINK_TITLE_LENGTH = 400;

export const truncateLinkTitle = (title: string): string => {
  const safeTitle = (title ?? '').toString();
  if (safeTitle.length <= MAX_LINK_TITLE_LENGTH) return safeTitle;

  const ellipsis = '...';
  const sliceLength = Math.max(MAX_LINK_TITLE_LENGTH - ellipsis.length, 0);
  return `${safeTitle.slice(0, sliceLength)}${ellipsis}`;
};

export const truncateDisplayUrl = (url: string, maxLength = 30, lineLength = 20): string => {
  const clean = (url ?? '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const truncated = clean.length <= maxLength ? clean : `${clean.slice(0, maxLength)}...`;

  if (truncated.length <= lineLength) return truncated;

  const chunks: string[] = [];
  for (let i = 0; i < truncated.length; i += lineLength) {
    chunks.push(truncated.slice(i, i + lineLength));
  }
  return chunks.join('\n');
};
