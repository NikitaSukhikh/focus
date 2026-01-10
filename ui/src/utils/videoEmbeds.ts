export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
}

export interface VideoEmbedRenderOptions {
  src: string;
  useWebview: boolean;
  webviewPartition?: string;
  webviewReferrer?: string;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

const isElectronRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  const anyWindow = window as any;
  if (anyWindow.desktopAPI) return true;
  if (anyWindow.process?.versions?.electron) return true;
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) return true;
  return false;
};

const getSafeWindowOrigin = (): string | null => {
  if (typeof window === 'undefined') return null;
  const origin = window.location?.origin;
  if (!origin || origin === 'null') return null;
  return origin;
};

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

export const getYoutubeWatchUrl = (embedUrl: string): string => {
  try {
    const parsed = new URL(embedUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    let videoId: string | null = null;

    const embedIndex = segments.indexOf('embed');
    if (embedIndex >= 0 && segments[embedIndex + 1]) {
      videoId = segments[embedIndex + 1];
    } else if (segments[0]) {
      videoId = segments[0];
    }

    if (!videoId) return embedUrl;

    const params = new URLSearchParams();
    params.set('v', videoId);
    const start = parsed.searchParams.get('start');
    if (start) {
      params.set('t', start);
    }

    return `https://www.youtube.com/watch?${params.toString()}`;
  } catch {
    return embedUrl;
  }
};

export const getYoutubeEmbedFrameUrl = (embedUrl: string): string => {
  try {
    const parsed = new URL(embedUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    let videoId: string | null = null;

    const embedIndex = segments.indexOf('embed');
    if (embedIndex >= 0 && segments[embedIndex + 1]) {
      videoId = segments[embedIndex + 1];
    } else if (segments[0]) {
      videoId = segments[0];
    }

    if (!videoId) return embedUrl;

    const params = new URLSearchParams(parsed.searchParams);
    params.set('autoplay', '0');
    params.set('playsinline', '1');
    params.set('modestbranding', '1');
    params.set('rel', '0');

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  } catch {
    return embedUrl;
  }
};

const getYoutubeIframeUrl = (embedUrl: string): string => {
  const baseUrl = getYoutubeEmbedFrameUrl(embedUrl);
  try {
    const parsed = new URL(baseUrl);
    const params = new URLSearchParams(parsed.searchParams);
    const origin = getSafeWindowOrigin();
    if (origin) params.set('origin', origin);
    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return baseUrl;
  }
};

export const getVideoEmbedRenderOptions = (videoEmbed: VideoEmbed): VideoEmbedRenderOptions => {
  const isElectron = isElectronRuntime();
  const isYoutube = videoEmbed.provider === 'youtube';

  if (isElectron && isYoutube) {
    return {
      src: getYoutubeEmbedFrameUrl(videoEmbed.embedUrl),
      useWebview: true,
      webviewPartition: 'persist:focus-webview',
      webviewReferrer: 'https://www.youtube.com',
    };
  }

  if (isYoutube) {
    return {
      src: getYoutubeIframeUrl(videoEmbed.embedUrl),
      useWebview: false,
    };
  }

  return {
    src: videoEmbed.embedUrl,
    useWebview: false,
  };
};
