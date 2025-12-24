const FALLBACK_QUESTION_MARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABrSURBVEhL7ZBBCsAgDATzE899Qf//MqUwwvYgSbFK0Q7klDCD2hTSceYRg361QC/qQr9LwNtX1IXeD+i+dVPRO/TPvsi7URf6eMDbX6gL/YcCEdSFfqcXRFAX+j9wR13oJwfeHPQrBMZhVgDG9DeYb1qTSwAAAABJRU5ErkJggg==';

export const FALLBACK_FAVICON = FALLBACK_QUESTION_MARK;

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, '');
}

export function buildFaviconUrl(targetUrl?: string): string | undefined {
  if (!targetUrl) return undefined;
  try {
    const parsed = new URL(targetUrl);
    const domain = normalizeHostname(parsed.hostname);
    const protocol = parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.protocol : 'https:';
    // Prefer the site's own favicon to detect unreachable domains (onError will fall back to question mark)
    return `${protocol}//${domain}/favicon.ico`;
  } catch {
    // Provide fallback for syntactically valid but unreachable domains
    return FALLBACK_FAVICON;
  }
}
