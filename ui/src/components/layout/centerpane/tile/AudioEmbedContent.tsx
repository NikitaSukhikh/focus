import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { RenameInput } from './RenameInput';
import { useAudioSync } from '../../../media/useAudioSync';

interface AudioEmbedContentProps {
  filePath: string;
  title: string;
  isRenaming: boolean;
  renamingValue: string;
  setRenamingValue: (value: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleRenameSubmit: () => void;
  renameInputRef: React.RefObject<HTMLInputElement>;
  isSelected: boolean;
  hoverScaleClass: string;
  onInteractionChange?: (locked: boolean) => void;
}

// AudioEmbedContent renders a compact inline player for audio files directly on the canvas tile.
export function AudioEmbedContent({
  filePath,
  title,
  isRenaming,
  renamingValue,
  setRenamingValue,
  handleRenameKeyDown,
  handleRenameSubmit,
  renameInputRef,
  isSelected,
  hoverScaleClass,
  onInteractionChange,
}: AudioEmbedContentProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { dispatchSync, isApplyingRef } = useAudioSync(filePath, audioRef, {
    onRemoteTimeUpdate: setCurrentTime,
    onRemotePlayStateChange: setIsPlaying,
  });

  const audioUrl = useMemo(() => {
    const params = new URLSearchParams({ file_path: filePath });
    return `/api/thumbnails/audio-file?${params.toString()}`;
  }, [filePath]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleLoaded = () => {
      setDuration(Number.isFinite(audioEl.duration) ? audioEl.duration : 0);
    };
    const handleTimeUpdate = () => {
      const nextTime = audioEl.currentTime || 0;
      setCurrentTime(nextTime);
      if (!isApplyingRef.current) {
        dispatchSync({ currentTime: nextTime });
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      if (!isApplyingRef.current) {
        dispatchSync({ isPlaying: true }, { assumeLeadership: true });
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (!isApplyingRef.current) {
        dispatchSync({ isPlaying: false });
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (!isApplyingRef.current) {
        dispatchSync({ isPlaying: false, currentTime: audioEl.duration || 0 });
      }
    };

    audioEl.addEventListener('loadedmetadata', handleLoaded);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('loadedmetadata', handleLoaded);
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, dispatchSync, isApplyingRef]);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const formatTime = (value: number) => {
    if (!isFinite(value) || value < 0) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTogglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.pause();
      dispatchSync({ isPlaying: false }, { assumeLeadership: true });
    } else {
      audioEl.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const newTime = parseFloat(e.target.value);
    audioEl.currentTime = newTime;
    setCurrentTime(newTime);
    if (isPlaying && audioEl.paused) {
      audioEl.play().catch(() => setIsPlaying(false));
    }
    dispatchSync({ currentTime: newTime, isPlaying }, { assumeLeadership: true });
  };

  const markInteraction = (locked: boolean) => onInteractionChange?.(locked);

  return (
    <div className={`w-full h-full flex flex-col transition-transform duration-150 ${hoverScaleClass}`}>
      <div className="w-full h-full rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg text-white flex flex-col justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-[3px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-inner" aria-hidden>
            <span className="w-1.5 h-3 bg-emerald-400/80 rounded-sm animate-pulse" />
            <span className="w-1.5 h-6 bg-cyan-400/80 rounded-sm animate-[pulse_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-4 bg-sky-400/80 rounded-sm animate-[pulse_1.1s_ease-in-out_infinite]" />
            <span className="w-1.5 h-5 bg-blue-400/80 rounded-sm animate-[pulse_1.25s_ease-in-out_infinite]" />
          </div>
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <RenameInput
                value={renamingValue}
                onChange={setRenamingValue}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSubmit}
                inputRef={renameInputRef}
              />
            ) : (
              <>
                <div className={`text-sm font-semibold line-clamp-2 leading-tight ${isSelected ? 'text-emerald-200' : 'text-white'}`}>
                  {title}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">Audio preview</div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleTogglePlay}
            onPointerDown={(e) => {
              e.stopPropagation();
              markInteraction(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              markInteraction(false);
            }}
            onPointerLeave={() => markInteraction(false)}
            className={`w-11 h-11 flex items-center justify-center rounded-full shadow-md transition-all ${
              isPlaying ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white/15 hover:bg-white/25'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleScrub}
            onPointerDown={(e) => {
              e.stopPropagation();
              markInteraction(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              markInteraction(false);
            }}
            onPointerLeave={() => markInteraction(false)}
            className="w-full h-2 rounded-full appearance-none bg-white/15"
            style={{
              background: `linear-gradient(to right, rgba(52,211,153,0.9) 0%, rgba(52,211,153,0.9) ${(duration ? (currentTime / duration) * 100 : 0)}%, rgba(255,255,255,0.15) ${(duration ? (currentTime / duration) * 100 : 0)}%, rgba(255,255,255,0.15) 100%)`
            }}
          />
          <div className="flex justify-between text-[11px] text-slate-200">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
          preload="metadata"
        />
      </div>
    </div>
  );
}
