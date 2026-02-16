import { useEffect, useState } from 'react';
import { API_BASE } from '@/config/api';

export interface AudioMetadata {
  duration: number;
  duration_formatted: string;
  bitrate: number;
  sample_rate: number;
  channels: number;
  file_size: number;
  file_size_human: string;
  artist?: string;
  album?: string;
  title?: string;
}

export function useAudioMetadata(filePath?: string) {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setMetadata(null);
      setMetadataError(null);
      return;
    }

    const params = new URLSearchParams({ file_path: filePath });

    fetch(`${API_BASE}/thumbnails/audio-metadata?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load metadata');
        return res.json();
      })
      .then((data: AudioMetadata) => {
        setMetadata(data);
        setMetadataError(null);
      })
      .catch((err) => {
        console.error('[Audio] Failed to fetch audio metadata:', err);
        setMetadataError('Failed to load audio metadata');
        setMetadata(null);
      });
  }, [filePath]);

  return { metadata, metadataError };
}
