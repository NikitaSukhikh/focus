import { useEffect, useState } from 'react';
import { API_BASE } from '@/config/api';
import { VideoEmbed, getYoutubeWatchUrl } from '@/utils/videoEmbeds';

export interface VideoEmbedMetadata {
  title?: string | null;
  description?: string | null;
  channelName?: string | null;
  channelIconUrl?: string | null;
}

// useVideoEmbedMetadata fetches YouTube metadata for embedded videos so the preview pane can show title/description.
export function useVideoEmbedMetadata(videoEmbed: VideoEmbed | null, sourceUrl?: string): VideoEmbedMetadata | null {
  const [metadata, setMetadata] = useState<VideoEmbedMetadata | null>(null);

  useEffect(() => {
    if (!videoEmbed || videoEmbed.provider !== 'youtube') {
      setMetadata(null);
      return;
    }

    const targetUrl = sourceUrl || getYoutubeWatchUrl(videoEmbed.embedUrl);
    if (!targetUrl) {
      setMetadata(null);
      return;
    }

    const controller = new AbortController();
    setMetadata(null);

    const params = new URLSearchParams({ url: targetUrl });
    fetch(`${API_BASE}/metadata/url?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch video metadata: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const rawTitle = data.title || data.og_title || '';
        const rawDescription = data.description || data.og_description || '';
        const rawChannel = data.channel_name || data.author_name || '';
        const rawChannelIcon = data.channel_icon_url || '';
        const title = rawTitle.trim().length > 0 ? rawTitle : null;
        const channelName = rawChannel.trim().length > 0 ? rawChannel : null;
        const channelIconUrl = rawChannelIcon.trim().length > 0 ? rawChannelIcon : null;
        let description = rawDescription.trim().length > 0 ? rawDescription : null;

        if (description && channelName && description.trim().toLowerCase() === channelName.trim().toLowerCase()) {
          description = null;
        }

        setMetadata({ title, description, channelName, channelIconUrl });
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        console.error('[useVideoEmbedMetadata] Failed to load video metadata:', err);
        setMetadata(null);
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- individual videoEmbed properties tracked to avoid object reference churn
  }, [videoEmbed?.embedUrl, videoEmbed?.provider, sourceUrl]);

  return metadata;
}
