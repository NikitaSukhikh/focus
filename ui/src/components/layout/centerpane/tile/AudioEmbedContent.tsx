// AudioEmbedContent renders compact audio controls and keeps colors token-based so dark mode stays readable.
import React, { useEffect } from 'react';
import { tileRingStyle, TILE_BACKGROUND } from '@/styles/tileStyles';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useAudioMetadata } from '@/components/media/useAudioMetadata';
import { useSharedAudioController } from '@/components/media/useSharedAudioController';

interface AudioEmbedContentProps {
  filePath: string;
  title: string;
  hoverScaleClass: string;
  onInteractionChange?: (locked: boolean) => void;
}

// AudioEmbedContent renders a compact inline player for audio files directly on the canvas tile.
export function AudioEmbedContent({
  filePath,
  title,
  hoverScaleClass,
  onInteractionChange,
}: AudioEmbedContentProps) {
  const { state, controls } = useSharedAudioController(filePath);
  const { isPlaying, currentTime, duration, volume, isMuted, error: audioError } = state;
  const { metadata } = useAudioMetadata(filePath);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTogglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isPlaying) {
      controls.pause();
    } else {
      controls.play();
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    controls.seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    controls.setVolume(newVolume);
  };

  const toggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    controls.toggleMute();
  };

  const markInteraction = (locked: boolean) => onInteractionChange?.(locked);

  const timelinePercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = (isMuted ? 0 : volume) * 100;
  const displayTitle = metadata?.title || title || 'Audio File';
  const displayArtist = metadata?.artist;
  const displayAlbum = metadata?.album;
  const displayDuration = metadata?.duration_formatted || formatTime(duration);
  const rangeTrackColor = 'var(--color-border-strong)';
  const rangeActiveColor = 'rgba(124, 58, 237, 0.7)';

  return (
    <div
      className={`w-full h-full flex flex-col transition-transform duration-150 ${hoverScaleClass}`}
      style={tileRingStyle('file')}
    >
      <div
        className="w-full h-full rounded-xl flex flex-col overflow-hidden"
        style={{
          background: TILE_BACKGROUND,
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-primary)',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <div
          className="px-4 pt-3 pb-2 flex items-start gap-3"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold leading-tight truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {displayTitle}
            </div>
            {displayArtist && (
              <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {displayArtist}
              </div>
            )}
            {displayAlbum && (
              <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                {displayAlbum}
              </div>
            )}
            <div
              className="text-[11px] truncate mt-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {filePath}
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-3 flex flex-col gap-3 overflow-hidden">
          {audioError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {audioError}
            </div>
          )}

          <div>
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
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${rangeActiveColor} 0%, ${rangeActiveColor} ${timelinePercent}%, ${rangeTrackColor} ${timelinePercent}%, ${rangeTrackColor} 100%)`,
              }}
            />
            <div
              className="flex justify-between text-[11px] mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{displayDuration}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className="w-12 h-12 flex items-center justify-center bg-purple-600/70 text-white rounded-full hover:bg-purple-700/70 transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={toggleMute}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  markInteraction(true);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  markInteraction(false);
                }}
                onPointerLeave={() => markInteraction(false)}
                className="p-2 hover:text-purple-600 transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  markInteraction(true);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  markInteraction(false);
                }}
                onPointerLeave={() => markInteraction(false)}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${rangeActiveColor} 0%, ${rangeActiveColor} ${volumePercent}%, ${rangeTrackColor} ${volumePercent}%, ${rangeTrackColor} 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
