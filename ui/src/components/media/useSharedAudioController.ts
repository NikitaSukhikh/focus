import { useEffect, useState } from 'react';
import { API_BASE } from '../../config/api';

interface AudioControllerState {
  filePath?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
}

type Listener = (state: AudioControllerState) => void;

const audio = new Audio();
const listeners = new Set<Listener>();

const initialState: AudioControllerState = {
  filePath: undefined,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  error: null,
};

let state: AudioControllerState = { ...initialState };

const notify = () => {
  listeners.forEach((listener) => listener(state));
};

const setState = (partial: Partial<AudioControllerState>) => {
  state = { ...state, ...partial };
  notify();
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const buildUrl = (filePath: string) => {
  const params = new URLSearchParams({ file_path: filePath });
  return `${API_BASE}/thumbnails/audio-file?${params.toString()}`;
};

// Wire native audio events once
audio.preload = 'metadata';
audio.addEventListener('timeupdate', () => {
  setState({ currentTime: audio.currentTime });
});
audio.addEventListener('loadedmetadata', () => {
  setState({ duration: audio.duration, error: null });
});
audio.addEventListener('durationchange', () => {
  setState({ duration: audio.duration });
});
audio.addEventListener('play', () => {
  setState({ isPlaying: true });
});
audio.addEventListener('pause', () => {
  setState({ isPlaying: false });
});
audio.addEventListener('ended', () => {
  setState({ isPlaying: false, currentTime: audio.duration || state.currentTime });
});
audio.addEventListener('volumechange', () => {
  setState({ volume: audio.volume, isMuted: audio.muted });
});
audio.addEventListener('error', () => {
  setState({ error: 'Failed to load audio file. The file may be corrupted or in an unsupported format.' });
});

const setFile = (filePath?: string) => {
  if (!filePath) {
    audio.pause();
    audio.src = '';
    setState({ ...initialState });
    return;
  }

  if (state.filePath === filePath) return;

  audio.src = buildUrl(filePath);
  audio.load();
  setState({
    filePath,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    error: null,
  });
};

const play = () => audio.play().catch(() => setState({ isPlaying: false }));
const pause = () => {
  audio.pause();
  setState({ isPlaying: false });
};
const seek = (time: number) => {
  const next = Number.isFinite(time) && time >= 0 ? time : 0;
  audio.currentTime = next;
  setState({ currentTime: next });
};
const setVolume = (value: number) => {
  const next = clamp01(value);
  audio.volume = next;
  audio.muted = next === 0 ? true : audio.muted;
  setState({ volume: next, isMuted: audio.muted });
};
const toggleMute = () => {
  audio.muted = !audio.muted;
  setState({ isMuted: audio.muted, volume: audio.muted ? 0 : audio.volume || state.volume || 1 });
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
};

export function useSharedAudioController(filePath?: string) {
  const [localState, setLocalState] = useState<AudioControllerState>(state);

  useEffect(() => subscribe(setLocalState), []);

  useEffect(() => {
    setFile(filePath);
  }, [filePath]);

  return {
    state: localState,
    controls: {
      play,
      pause,
      seek,
      setVolume,
      toggleMute,
    },
  };
}
