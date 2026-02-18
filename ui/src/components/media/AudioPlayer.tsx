// AudioPlayer renders the full audio-file preview and maps visual colors to theme tokens for contrast in both themes.
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAudioMetadata } from '@/components/media/useAudioMetadata';
import { useSharedAudioController } from '@/components/media/useSharedAudioController';

interface AudioPlayerProps {
  filePath: string;
  title?: string;
}

export function AudioPlayer({ filePath, title }: AudioPlayerProps) {
  const { state, controls } = useSharedAudioController(filePath);
  const { isPlaying, currentTime, duration, volume, isMuted, error: audioError } = state;
  const { metadata, metadataError } = useAudioMetadata(filePath);

  const togglePlayPause = () => {
    if (isPlaying) {
      controls.pause();
      return;
    }
    controls.play();
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    controls.seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    controls.setVolume(newVolume);
  };

  const toggleMute = () => {
    controls.toggleMute();
  };

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

  const displayTitle = metadata?.title || title || 'Audio File';
  const displayArtist = metadata?.artist;
  const displayAlbum = metadata?.album;
  const timelinePercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = (isMuted ? 0 : volume) * 100;
  const rangeTrackColor = 'var(--color-border-strong)';
  const rangeActiveColor = 'rgba(124, 58, 237, 0.7)';

  return (
    <div className="flex-1 overflow-auto article-scroll">
      <div className="p-8 max-w-4xl mx-auto">
        {/* Title Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {displayTitle}
          </h1>
          {displayArtist && (
            <p className="text-xl mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {displayArtist}
            </p>
          )}
          {displayAlbum && (
            <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
              {displayAlbum}
            </p>
          )}
        </div>

        {/* Error Display */}
        {audioError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
            {audioError}
          </div>
        )}

        {/* Player Controls */}
        <div
          className="rounded-lg p-6 mb-6"
          style={{
            background: 'var(--background-light)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleTimeChange}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${rangeActiveColor} 0%, ${rangeActiveColor} ${timelinePercent}%, ${rangeTrackColor} ${timelinePercent}%, ${rangeTrackColor} 100%)`,
              }}
            />
            <div
              className="flex justify-between text-sm mt-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-6">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="w-14 h-14 flex items-center justify-center bg-purple-600/70 text-white rounded-full hover:bg-purple-700/70 transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:text-purple-600 transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${rangeActiveColor} 0%, ${rangeActiveColor} ${volumePercent}%, ${rangeTrackColor} ${volumePercent}%, ${rangeTrackColor} 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        {metadata && !metadataError && (
          <div
            className="rounded-lg p-6"
            style={{
              background: 'var(--background-light)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              File Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold w-32" style={{ color: 'var(--color-text-primary)' }}>
                  Location:
                </span>
                <span className="break-all flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {filePath}
                </span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32" style={{ color: 'var(--color-text-primary)' }}>
                  Size:
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {metadata.file_size_human}
                </span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32" style={{ color: 'var(--color-text-primary)' }}>
                  Duration:
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {metadata.duration_formatted}
                </span>
              </div>
              {metadata.bitrate > 0 && (
                <div className="flex">
                  <span
                    className="font-semibold w-32"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Bitrate:
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {metadata.bitrate} kbps
                  </span>
                </div>
              )}
              {metadata.sample_rate > 0 && (
                <div className="flex">
                  <span
                    className="font-semibold w-32"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Sample Rate:
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {metadata.sample_rate} Hz
                  </span>
                </div>
              )}
              {metadata.channels > 0 && (
                <div className="flex">
                  <span
                    className="font-semibold w-32"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Channels:
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {metadata.channels === 1
                      ? 'Mono'
                      : metadata.channels === 2
                        ? 'Stereo'
                        : `${metadata.channels} channels`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {metadataError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            {metadataError}
          </div>
        )}
      </div>
    </div>
  );
}
