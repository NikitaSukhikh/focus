import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAudioMetadata } from './useAudioMetadata';
import { useSharedAudioController } from './useSharedAudioController';

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-4xl mx-auto">
        {/* Title Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-slate-800">
            {displayTitle}
          </h1>
          {displayArtist && (
            <p className="text-xl text-slate-600 mb-1">{displayArtist}</p>
          )}
          {displayAlbum && (
            <p className="text-lg text-slate-500">{displayAlbum}</p>
          )}
        </div>

        {/* Error Display */}
        {audioError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">
            {audioError}
          </div>
        )}

        {/* Player Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleTimeChange}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(currentTime / (duration || 1)) * 100}%, #e2e8f0 ${(currentTime / (duration || 1)) * 100}%, #e2e8f0 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-slate-600 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-6">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="w-14 h-14 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-slate-600 hover:text-purple-600 transition-colors"
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
                className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(isMuted ? 0 : volume) * 100}%, #e2e8f0 ${(isMuted ? 0 : volume) * 100}%, #e2e8f0 100%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        {metadata && !metadataError && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">File Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold text-slate-700 w-32">Location:</span>
                <span className="text-slate-600 break-all flex-1">{filePath}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-32">Size:</span>
                <span className="text-slate-600">{metadata.file_size_human}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-32">Duration:</span>
                <span className="text-slate-600">{metadata.duration_formatted}</span>
              </div>
              {metadata.bitrate > 0 && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-32">Bitrate:</span>
                  <span className="text-slate-600">{metadata.bitrate} kbps</span>
                </div>
              )}
              {metadata.sample_rate > 0 && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-32">Sample Rate:</span>
                  <span className="text-slate-600">{metadata.sample_rate} Hz</span>
                </div>
              )}
              {metadata.channels > 0 && (
                <div className="flex">
                  <span className="font-semibold text-slate-700 w-32">Channels:</span>
                  <span className="text-slate-600">{metadata.channels === 1 ? 'Mono' : metadata.channels === 2 ? 'Stereo' : `${metadata.channels} channels`}</span>
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
