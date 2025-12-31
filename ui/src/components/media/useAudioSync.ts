import { useCallback, useEffect, useMemo, useRef } from 'react';

interface AudioSyncEventDetail {
  filePath: string;
  currentTime?: number;
  isPlaying?: boolean;
  volume?: number;
  isMuted?: boolean;
  sourceId: string;
}

interface UseAudioSyncHandlers {
  onRemoteTimeUpdate?: (time: number) => void;
  onRemotePlayStateChange?: (isPlaying: boolean) => void;
  onRemoteVolumeChange?: (volume: number, isMuted: boolean) => void;
}

export function useAudioSync(
  filePath: string | undefined,
  audioRef: React.RefObject<HTMLAudioElement>,
  handlers: UseAudioSyncHandlers
) {
  const { onRemotePlayStateChange, onRemoteTimeUpdate } = handlers;
  const { onRemoteVolumeChange } = handlers;
  const syncSourceId = useMemo(
    () => `audio-sync-${Math.random().toString(36).slice(2)}`,
    []
  );
  const isApplyingRef = useRef(false);
  const isLeaderRef = useRef(false);

  const dispatchSync = useCallback(
    (
      update: Omit<Partial<AudioSyncEventDetail>, 'filePath' | 'sourceId'>,
      options: { assumeLeadership?: boolean } = {}
    ) => {
      const { assumeLeadership = false } = options;
      const allowWhileApplying = assumeLeadership;
      if (!filePath) return;
      if (isApplyingRef.current && !allowWhileApplying) return;

      if (assumeLeadership) {
        isLeaderRef.current = true;
      }

      if (!isLeaderRef.current) return;

      window.dispatchEvent(
        new CustomEvent<AudioSyncEventDetail>('audio:sync', {
          detail: {
            filePath,
            sourceId: syncSourceId,
            ...update,
          },
        })
      );
    },
    [filePath, syncSourceId]
  );

  const applyIncomingSync = useCallback(
    (detail: AudioSyncEventDetail) => {
      if (!filePath || detail.filePath !== filePath || detail.sourceId === syncSourceId) return;
      const audio = audioRef.current;
      if (!audio) return;

      isApplyingRef.current = true;
      isLeaderRef.current = false;

      if (typeof detail.currentTime === 'number' && Number.isFinite(detail.currentTime)) {
        audio.currentTime = detail.currentTime;
        onRemoteTimeUpdate?.(detail.currentTime);
      }

      if (typeof detail.isPlaying === 'boolean') {
        // Followers stay paused (single audible source) but mirror play state for UI
        audio.pause();
        onRemotePlayStateChange?.(detail.isPlaying);
      }

      const hasVolume = typeof detail.volume === 'number' && Number.isFinite(detail.volume);
      const hasMute = typeof detail.isMuted === 'boolean';
      if (hasVolume || hasMute) {
        const nextVolume = hasVolume ? Math.max(0, Math.min(1, detail.volume ?? 0)) : audio.volume;
        const nextMuted = hasMute ? !!detail.isMuted : nextVolume === 0;
        const appliedVolume = nextMuted ? 0 : nextVolume;
        audio.volume = appliedVolume;
        onRemoteVolumeChange?.(appliedVolume, nextMuted);
      }

      requestAnimationFrame(() => {
        isApplyingRef.current = false;
      });
    },
    [audioRef, filePath, onRemotePlayStateChange, onRemoteTimeUpdate, onRemoteVolumeChange, syncSourceId]
  );

  useEffect(() => {
    const handleSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<AudioSyncEventDetail>).detail;
      if (!detail) return;
      applyIncomingSync(detail);
    };

    window.addEventListener('audio:sync', handleSyncEvent);
    return () => window.removeEventListener('audio:sync', handleSyncEvent);
  }, [applyIncomingSync]);

  useEffect(() => {
    isLeaderRef.current = false;
    isApplyingRef.current = false;
  }, [filePath]);

  return { dispatchSync, isApplyingRef, isLeaderRef };
}
