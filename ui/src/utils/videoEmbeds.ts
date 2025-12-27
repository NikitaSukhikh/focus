export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

const parseStartSeconds = (value: string | null): number | null => {
  if (!value) return null;
  const numeric = parseInt(value, 10);
  if (!Number.isNaN(numeric)) return numeric;

  // Handle formats like 1h2m3s or 90s
  const parts = value.match(/(\d+)(h|m|s)/gi);
  if (!parts) return null;

  let total = 0;
  for (const part of parts) {
    const amount = parseInt(part, 10);
    if (part.toLowerCase().endsWith('h')) total += amount * 3600;
    else if (part.toLowerCase().endsWith('m')) total += amount * 60;
    else if (part.toLowerCase().endsWith('s')) total += amount;
  }
  return total || null;
};

/**
 * Convert a YouTube/Vimeo URL into an embeddable URL if possible.
 */
export const getVideoEmbed = (rawUrl?: string): VideoEmbed | null => {
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  // YouTube: watch URL, short youtu.be, or already-embed URL
  if (YOUTUBE_HOSTS.includes(host)) {
    let videoId: string | null = null;

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (parsed.pathname.startsWith('/watch')) {
      videoId = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.replace('/shorts/', '').split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.replace('/embed/', '').split('/')[0] || null;
    }

    if (videoId) {
      const start = parseStartSeconds(parsed.searchParams.get('t') || parsed.searchParams.get('start'));
      const params = new URLSearchParams();
      params.set('rel', '0');
      if (start !== null) params.set('start', String(start));

      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
      };
    }
  }

  // Vimeo: plain vimeo.com/<id> or player.vimeo.com/video/<id>
  if (VIMEO_HOSTS.includes(host)) {
    let videoId: string | null = null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (host === 'player.vimeo.com') {
      if (segments[0] === 'video' && segments[1]) {
        videoId = segments[1];
      }
    } else {
      videoId = segments[0] ?? null;
    }

    if (videoId) {
      return {
        provider: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
      };
    }
  }

  return null;
};
