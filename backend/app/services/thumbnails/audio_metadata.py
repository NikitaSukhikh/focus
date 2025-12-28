"""
Audio metadata extraction service
"""

import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Supported audio file extensions
AUDIO_EXTENSIONS = {
    '.mp3', '.wav', '.flac', '.ogg', '.oga', '.m4a', '.aac',
    '.wma', '.opus', '.aiff', '.aif', '.aifc', '.alac', '.ape',
    '.wv', '.mka'
}


def is_audio_file(file_path: str | Path) -> bool:
    """
    Check if the file is a supported audio format

    Args:
        file_path: Path to the file

    Returns:
        True if file is a supported audio format
    """
    ext = Path(file_path).suffix.lower()
    return ext in AUDIO_EXTENSIONS


def get_audio_metadata(file_path: str | Path) -> Dict[str, Any]:
    """
    Extract metadata from an audio file

    Args:
        file_path: Path to the audio file

    Returns:
        Dictionary containing audio metadata:
        - duration: Duration in seconds (float)
        - bitrate: Bitrate in kbps (int)
        - sample_rate: Sample rate in Hz (int)
        - channels: Number of audio channels (int)
        - title: Track title (str, optional)
        - artist: Artist name (str, optional)
        - album: Album name (str, optional)
        - file_size: File size in bytes (int)

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If file is not a supported audio format
        RuntimeError: If metadata extraction fails
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if not file_path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")

    if not is_audio_file(file_path):
        raise ValueError(f"File is not a supported audio format: {file_path}")

    try:
        # Try using mutagen (preferred for comprehensive metadata)
        import mutagen
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.oggvorbis import OggVorbis
        from mutagen.mp4 import MP4
        from mutagen.wave import WAVE

        audio = mutagen.File(file_path)

        if audio is None:
            raise RuntimeError(f"Unable to read audio file: {file_path}")

        metadata = {
            "file_size": file_path.stat().st_size,
            "duration": 0.0,
            "bitrate": 0,
            "sample_rate": 0,
            "channels": 0,
        }

        # Get duration
        if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
            metadata["duration"] = round(audio.info.length, 2)

        # Get bitrate
        if hasattr(audio, 'info') and hasattr(audio.info, 'bitrate'):
            metadata["bitrate"] = int(audio.info.bitrate / 1000)  # Convert to kbps

        # Get sample rate
        if hasattr(audio, 'info') and hasattr(audio.info, 'sample_rate'):
            metadata["sample_rate"] = audio.info.sample_rate

        # Get channels
        if hasattr(audio, 'info') and hasattr(audio.info, 'channels'):
            metadata["channels"] = audio.info.channels

        # Extract tags (title, artist, album)
        if audio.tags:
            # Try common tag keys for different formats
            title_keys = ['TIT2', 'title', '\xa9nam', 'TITLE']
            artist_keys = ['TPE1', 'artist', '\xa9ART', 'ARTIST']
            album_keys = ['TALB', 'album', '\xa9alb', 'ALBUM']

            for key in title_keys:
                if key in audio.tags:
                    value = audio.tags[key]
                    metadata["title"] = str(value[0]) if isinstance(value, list) else str(value)
                    break

            for key in artist_keys:
                if key in audio.tags:
                    value = audio.tags[key]
                    metadata["artist"] = str(value[0]) if isinstance(value, list) else str(value)
                    break

            for key in album_keys:
                if key in audio.tags:
                    value = audio.tags[key]
                    metadata["album"] = str(value[0]) if isinstance(value, list) else str(value)
                    break

        logger.info(f"Extracted audio metadata from {file_path}: {metadata}")
        return metadata

    except ImportError:
        logger.warning("mutagen library not installed, falling back to basic metadata")
        # Fallback: return basic file info without detailed audio metadata
        return {
            "file_size": file_path.stat().st_size,
            "duration": 0.0,
            "bitrate": 0,
            "sample_rate": 0,
            "channels": 0,
        }
    except Exception as e:
        logger.error(f"Failed to extract audio metadata from {file_path}: {e}")
        raise RuntimeError(f"Failed to extract audio metadata: {e}")


def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string (MM:SS or HH:MM:SS)

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted duration string
    """
    if seconds <= 0:
        return "0:00"

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"
