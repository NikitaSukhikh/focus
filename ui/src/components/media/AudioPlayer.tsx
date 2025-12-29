import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioMetadata {
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

interface AudioPlayerProps {
  filePath: string;
  title?: string;
}

export function AudioPlayer({ filePath, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Build audio URL using API endpoint
  const audioUrl = `/api/thumbnails/audio-file?${new URLSearchParams({ file_path: filePath }).toString()}`;

  // Load audio metadata
  useEffect(() => {
    const params = new URLSearchParams({ file_path: filePath });
    fetch(`/api/thumbnails/audio-metadata?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load metadata');
        return res.json();
      })
      .then(data => {
        setMetadata(data);
        setMetadataError(null);
      })
      .catch(err => {
        console.error('[AudioPlayer] Failed to fetch audio metadata:', err);
        setMetadataError('Failed to load audio metadata');
        setMetadata(null);
      });
  }, [filePath]);

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
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
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('[AudioPlayer] Audio error:', e);
            setAudioError('Failed to load audio file. The file may be corrupted or in an unsupported format.');
            setIsPlaying(false);
          }}
          onLoadStart={() => {
            console.log('[AudioPlayer] Loading audio from:', audioUrl);
            setAudioError(null);
          }}
          onCanPlay={() => {
            console.log('[AudioPlayer] Audio can play');
          }}
          controls={false}
        >
          <track kind="captions" src="data:text/vtt," label="Captions not provided" />
        </audio>

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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
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
                className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
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
