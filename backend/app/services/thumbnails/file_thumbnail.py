"""
File Thumbnail Service

Handles high-quality thumbnail generation for images and other file types.
Uses Pillow for image processing with quality preservation.
"""

from pathlib import Path
import hashlib
from PIL import Image, ImageOps
import mimetypes

# Register HEIF support for Pillow
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # HEIF support not available

from app.core.config import get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)
settings = get_settings()


class FileThumbnailService:
    """
    Service for generating high-quality thumbnails from files.

    Focuses on preserving image quality and proper aspect ratios.
    """

    # Supported image formats
    SUPPORTED_IMAGE_FORMATS = {
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif',
        '.webp', '.ico', '.heic', '.heif'
    }
    HEIF_FORMATS = {'.heic', '.heif'}

    def __init__(self):
        """Initialize the thumbnail service."""
        self.settings = settings
        self.cache_dir = Path(settings.storage.cache_dir) / "thumbnails"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def generate_image_thumbnail(
        self,
        file_path: str,
        max_width: int | None = None,
        max_height: int | None = None,
        quality: int = 95,
        force_regenerate: bool = False
    ) -> str:
        """
        Generate high-quality thumbnail for an image file.

        Args:
            file_path: Path to the image file
            max_width: Maximum thumbnail width (None uses settings default)
            max_height: Maximum thumbnail height (None uses settings default)
            quality: JPEG quality (1-100, higher is better)
            force_regenerate: Force regeneration even if cached

        Returns:
            str: Path to the generated thumbnail

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a supported image format
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Check if image format is supported
        if path.suffix.lower() not in self.SUPPORTED_IMAGE_FORMATS:
            raise ValueError(
                f"Unsupported image format: {path.suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_IMAGE_FORMATS)}"
            )

        # Use settings defaults if not specified
        max_width = max_width or settings.storage.thumbnail_max_width
        max_height = max_height or settings.storage.thumbnail_max_height
        quality = min(max(quality, 1), 100)  # Clamp to 1-100

        # Generate cache key
        cache_key = self._generate_cache_key(file_path, max_width, max_height, quality)
        thumbnail_path = self.cache_dir / f"{cache_key}.jpg"

        # Return cached thumbnail if exists and not forcing regeneration
        if thumbnail_path.exists() and not force_regenerate:
            logger.debug(
                f"Using cached thumbnail: {thumbnail_path}",
                extra={"source": file_path, "cached": True}
            )
            return str(thumbnail_path)

        # Generate new thumbnail
        try:
            # Open image
            with Image.open(path) as img:
                img = self._prepare_image_for_display(img)

                # Auto-orient based on EXIF data
                img = ImageOps.exif_transpose(img)

                # Calculate thumbnail size preserving aspect ratio
                original_width, original_height = img.size
                aspect_ratio = original_width / original_height

                # Determine thumbnail dimensions
                if aspect_ratio > (max_width / max_height):
                    # Width is the limiting factor
                    thumb_width = max_width
                    thumb_height = int(max_width / aspect_ratio)
                else:
                    # Height is the limiting factor
                    thumb_height = max_height
                    thumb_width = int(max_height * aspect_ratio)

                # Use high-quality resampling
                # LANCZOS provides the best quality for downscaling
                img_thumbnail = img.resize(
                    (thumb_width, thumb_height),
                    Image.Resampling.LANCZOS
                )

                # Save with high quality
                img_thumbnail.save(
                    thumbnail_path,
                    'JPEG',
                    quality=quality,
                    optimize=True,
                    progressive=True  # Progressive JPEG for better web display
                )

            logger.info(
                f"Generated high-quality thumbnail: {thumbnail_path}",
                extra={
                    "source": file_path,
                    "original_size": f"{original_width}x{original_height}",
                    "thumbnail_size": f"{thumb_width}x{thumb_height}",
                    "quality": quality
                }
            )

            return str(thumbnail_path)

        except Exception as e:
            logger.error(
                f"Failed to generate thumbnail for {file_path}: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to generate thumbnail: {e}")

    def get_full_image_path(self, file_path: str) -> str:
        """
        Get the path to display a full image (for preview).

        Converts HEIC/HEIF images to JPEG for browser compatibility while
        keeping other formats untouched.

        Args:
            file_path: Path to the image file

        Returns:
            str: Path to the full-quality image
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if path.suffix.lower() in self.HEIF_FORMATS:
            return self._convert_heif_to_jpeg(path)

        return str(path.resolve())

    def _convert_heif_to_jpeg(self, path: Path, quality: int = 95) -> str:
        """
        Convert HEIC/HEIF images to JPEG for preview rendering.

        Returns:
            str: Path to the converted JPEG file in cache.
        """
        quality = min(max(quality, 1), 100)
        cache_key = self._generate_full_image_cache_key(str(path), quality)
        output_path = self.cache_dir / f"{cache_key}_full.jpg"

        if output_path.exists():
            return str(output_path)

        try:
            with Image.open(path) as img:
                img = self._prepare_image_for_display(img)
                img = ImageOps.exif_transpose(img)
                img.save(
                    output_path,
                    'JPEG',
                    quality=quality,
                    optimize=True,
                    progressive=True
                )
        except Exception as e:
            logger.error(
                f"Failed to convert HEIF image for preview: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to convert HEIF image: {e}")

        return str(output_path)

    def get_image_dimensions(self, file_path: str) -> tuple[int, int]:
        """
        Get the dimensions of an image file.

        Args:
            file_path: Path to the image file

        Returns:
            tuple[int, int]: (width, height)

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a valid image
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with Image.open(path) as img:
                return img.size
        except Exception as e:
            raise ValueError(f"Failed to read image dimensions: {e}")

    def is_image(self, file_path: str) -> bool:
        """
        Check if a file is a supported image format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a supported image
        """
        path = Path(file_path)
        return path.suffix.lower() in self.SUPPORTED_IMAGE_FORMATS

    def is_pdf(self, file_path: str) -> bool:
        """
        Check if a file is a PDF.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a PDF
        """
        path = Path(file_path)
        return path.suffix.lower() == '.pdf'

    def get_cached_thumbnail(self, file_path: str) -> str | None:
        """
        Get cached thumbnail path if it exists.

        Args:
            file_path: Path to the original file

        Returns:
            str | None: Path to cached thumbnail, or None if not cached
        """
        cache_key = self._generate_cache_key(
            file_path,
            settings.storage.thumbnail_max_width,
            settings.storage.thumbnail_max_height,
            settings.storage.thumbnail_quality
        )
        thumbnail_path = self.cache_dir / f"{cache_key}.jpg"

        if thumbnail_path.exists():
            return str(thumbnail_path)
        return None

    def clear_cache(self, file_path: str | None = None) -> int:
        """
        Clear thumbnail cache.

        Args:
            file_path: Specific file to clear cache for (None clears all)

        Returns:
            int: Number of cache files deleted
        """
        if file_path:
            # Clear specific file's thumbnails
            cache_key = self._generate_cache_key(
                file_path,
                settings.storage.thumbnail_max_width,
                settings.storage.thumbnail_max_height,
                settings.storage.thumbnail_quality
            )
            thumbnail_path = self.cache_dir / f"{cache_key}.jpg"

            if thumbnail_path.exists():
                thumbnail_path.unlink()
                logger.info(f"Cleared thumbnail cache for {file_path}")
                return 1
            return 0
        else:
            # Clear all thumbnails
            count = 0
            for thumbnail_file in self.cache_dir.glob("*.jpg"):
                thumbnail_file.unlink()
                count += 1

            logger.info(f"Cleared all thumbnail cache ({count} files)")
            return count

    def _generate_cache_key(
        self,
        file_path: str,
        width: int,
        height: int,
        quality: int
    ) -> str:
        """
        Generate a unique cache key for a thumbnail.

        Args:
            file_path: Source file path
            width: Thumbnail width
            height: Thumbnail height
            quality: Thumbnail quality

        Returns:
            str: Cache key (hash)
        """
        # Include file path, dimensions, quality, and modification time in key
        path = Path(file_path)
        mtime = path.stat().st_mtime if path.exists() else 0

        key_string = f"{file_path}_{width}_{height}_{quality}_{mtime}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def get_file_size(self, file_path: str) -> int:
        """
        Get file size in bytes.

        Args:
            file_path: Path to the file

        Returns:
            int: File size in bytes
        """
        path = Path(file_path)
        if path.exists():
            return path.stat().st_size
        return 0

    def get_human_readable_size(self, size_bytes: int) -> str:
        """
        Convert bytes to human-readable size.

        Args:
            size_bytes: Size in bytes

        Returns:
            str: Human-readable size (e.g., "2.5 MB")
        """
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"

    def _prepare_image_for_display(self, img: Image.Image) -> Image.Image:
        """Normalize image mode for display-safe RGB output."""
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            return background
        if img.mode != 'RGB':
            return img.convert('RGB')
        return img

    def _generate_full_image_cache_key(self, file_path: str, quality: int) -> str:
        """Generate a cache key for full-size preview conversions."""
        path = Path(file_path)
        mtime = path.stat().st_mtime if path.exists() else 0
        key_string = f"{file_path}_full_{quality}_{mtime}"
        return hashlib.md5(key_string.encode()).hexdigest()


# Singleton instance
file_thumbnail_service = FileThumbnailService()
