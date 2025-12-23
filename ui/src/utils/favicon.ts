function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  if (lower === 'youtu.be') return 'youtube.com';
  return hostname.replace(/^www\./i, '');
}

export function buildFaviconUrl(targetUrl?: string): string | undefined {
  if (!targetUrl) return undefined;
  try {
    const parsed = new URL(targetUrl);
    const domain = normalizeHostname(parsed.hostname);
    // Use Google's favicon service for consistent sizing; domain-based works better for shortlinks
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
  } catch {
    return undefined;
  }
}
