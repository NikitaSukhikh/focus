import { useCallback, useEffect, useMemo, useRef } from 'react';

interface AudioSyncEventDetail {
  filePath: string;
  currentTime?: number;
  isPlaying?: boolean;
  sourceId: string;
}

interface UseAudioSyncHandlers {
  onRemoteTimeUpdate?: (time: number) => void;
  onRemotePlayStateChange?: (isPlaying: boolean) => void;
}

export function useAudioSync(
  filePath: string | undefined,
  audioRef: React.RefObject<HTMLAudioElement>,
  handlers: UseAudioSyncHandlers
) {
  const { onRemotePlayStateChange, onRemoteTimeUpdate } = handlers;
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
      if (!filePath || isApplyingRef.current) return;

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
        if (detail.isPlaying) {
          audio.pause();
          onRemotePlayStateChange?.(true);
        } else {
          audio.pause();
          onRemotePlayStateChange?.(false);
        }
      }

      requestAnimationFrame(() => {
        isApplyingRef.current = false;
      });
    },
    [audioRef, filePath, onRemotePlayStateChange, onRemoteTimeUpdate, syncSourceId]
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
