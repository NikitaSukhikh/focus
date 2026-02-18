// Text helpers centralize truncation and URL-to-title formatting for tile labels.
export const MAX_LINK_TITLE_LENGTH = 400;

const GENERIC_PATH_SEGMENTS = new Set([
  'index',
  'home',
  'article',
  'articles',
  'post',
  'posts',
  'blog',
  'page',
]);

const parseHttpUrl = (value: string): URL | null => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
};

const decodeMaybeEncoded = (value: string): string => {
  let result = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch {
      break;
    }
  }
  return result;
};

const sanitizePathSegment = (segment: string): string =>
  decodeMaybeEncoded(segment)
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const truncateLinkTitle = (title: string): string => {
  const safeTitle = (title ?? '').toString();
  if (safeTitle.length <= MAX_LINK_TITLE_LENGTH) return safeTitle;

  const ellipsis = '...';
  const sliceLength = Math.max(MAX_LINK_TITLE_LENGTH - ellipsis.length, 0);
  return `${safeTitle.slice(0, sliceLength)}${ellipsis}`;
};

export const deriveLinkTitleFromUrl = (url: string): string => {
  const parsed = parseHttpUrl(url);
  const fallback = truncateLinkTitle((url ?? '').trim());
  if (!parsed) return fallback;

  const segments = parsed.pathname
    .split('/')
    .map((part) => sanitizePathSegment(part))
    .filter(Boolean);

  const lastSegment = segments.at(-1) || '';
  const host = parsed.hostname.replace(/^www\./i, '');
  const candidate =
    lastSegment && !GENERIC_PATH_SEGMENTS.has(lastSegment.toLowerCase())
      ? lastSegment
      : host;

  return truncateLinkTitle(candidate || fallback);
};

export const resolveLinkTitle = (candidateTitle: string | undefined | null, url?: string): string => {
  const title = (candidateTitle ?? '').trim();

  if (title) {
    const asUrl = parseHttpUrl(title);
    if (!asUrl) return truncateLinkTitle(title);
    return deriveLinkTitleFromUrl(title);
  }

  return url ? deriveLinkTitleFromUrl(url) : '';
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

export const truncateDisplayPath = (path: string, maxLength = 30, lineLength = 20): string => {
  const safe = (path ?? '').toString();
  const truncated = safe.length <= maxLength ? safe : `${safe.slice(0, maxLength)}...`;

  if (truncated.length <= lineLength) return truncated;

  const chunks: string[] = [];
  for (let i = 0; i < truncated.length; i += lineLength) {
    chunks.push(truncated.slice(i, i + lineLength));
  }
  return chunks.join('\n');
};
