"""
Presentation Preview Service

Handles conversion of presentation files to HTML for preview display.
Supports: .ppt, .pptx, .odp
"""

from pathlib import Path
from typing import Optional, List
import hashlib
import os
import re
import shutil
import subprocess

from app.core.config import get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)
settings = get_settings()


class PresentationPreviewService:
    """
    Service for converting presentations to HTML for preview.
    """

    SUPPORTED_PRESENTATION_FORMATS = {
        '.ppt',
        '.pptx',
        '.odp',
    }

    CACHE_VERSION = "2"
    CONVERT_TIMEOUT_SECONDS = 120

    def __init__(self):
        """Initialize the presentation preview service."""
        self.settings = settings
        self.cache_dir = Path(settings.storage.cache_dir) / "presentation_previews"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._soffice_path: Optional[str] = None

    def convert_presentation_to_html(
        self,
        file_path: str,
        force_regenerate: bool = False
    ) -> str:
        """
        Convert a presentation to HTML for preview.

        Args:
            file_path: Path to the presentation file
            force_regenerate: Force regeneration even if cached

        Returns:
            str: Path to the generated HTML file

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a supported format or LibreOffice is missing
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        if path.suffix.lower() not in self.SUPPORTED_PRESENTATION_FORMATS:
            raise ValueError(
                f"Unsupported presentation format: {path.suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_PRESENTATION_FORMATS)}"
            )

        soffice_path = self._resolve_soffice_path()
        if not soffice_path:
            raise ValueError(
                "Presentation preview requires LibreOffice. "
                "Install LibreOffice and ensure 'soffice' is available on PATH "
                "or set LIBREOFFICE_PATH to the soffice executable."
            )

        cache_key = self._generate_cache_key(file_path)
        preview_dir = self.cache_dir / cache_key
        images_dir = preview_dir / "images"
        html_path = preview_dir / "index.html"

        if html_path.exists() and not force_regenerate:
            if images_dir.exists() and any(images_dir.glob("*.png")):
                logger.debug(
                    f"Using cached presentation preview: {html_path}",
                    extra={"source": file_path, "cached": True}
                )
                return str(html_path)

        preview_dir.mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)
        self._clear_directory(images_dir)

        try:
            self._convert_with_libreoffice(soffice_path, path, images_dir)
            slide_images = self._collect_slide_images(images_dir, path.stem)
            if not slide_images:
                raise ValueError("LibreOffice did not produce slide images for preview")

            html_content = self._build_html(path.name, slide_images, cache_key)
            html_path.write_text(html_content, encoding="utf-8")

            logger.info(
                f"Generated presentation preview: {html_path}",
                extra={"source": file_path}
            )

            return str(html_path)

        except Exception as e:
            logger.error(
                f"Failed to convert presentation to HTML: {file_path}: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to convert presentation: {e}")

    def _resolve_soffice_path(self) -> Optional[str]:
        """Locate the LibreOffice soffice executable."""
        if self._soffice_path and Path(self._soffice_path).exists():
            return self._soffice_path

        env_path = os.environ.get("LIBREOFFICE_PATH")
        if env_path and Path(env_path).exists():
            self._soffice_path = env_path
            return env_path

        for name in ("soffice", "libreoffice"):
            found = shutil.which(name)
            if found:
                self._soffice_path = found
                return found

        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            "/usr/bin/soffice",
            "/usr/lib/libreoffice/program/soffice",
            "/snap/bin/libreoffice",
        ]

        for candidate in candidates:
            if Path(candidate).exists():
                self._soffice_path = candidate
                return candidate

        return None

    def _convert_with_libreoffice(self, soffice_path: str, source_path: Path, output_dir: Path) -> None:
        """Convert presentation slides to PNG using LibreOffice."""
        command = [
            soffice_path,
            "--headless",
            "--nologo",
            "--nolockcheck",
            "--nodefault",
            "--norestore",
            "--invisible",
            "--convert-to",
            "png",
            "--outdir",
            str(output_dir),
            str(source_path),
        ]

        logger.info(f"Converting presentation with LibreOffice: {source_path}")
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=self.CONVERT_TIMEOUT_SECONDS,
        )

        if result.returncode != 0:
            error_output = (result.stderr or result.stdout or "").strip()
            raise ValueError(f"LibreOffice conversion failed: {error_output or 'unknown error'}")

    def _collect_slide_images(self, images_dir: Path, base_name: str) -> List[str]:
        """Collect and sort slide images by slide index."""
        images = [
            path for path in images_dir.iterdir()
            if path.is_file() and path.suffix.lower() == ".png"
        ]
        if not images:
            return []

        def sort_key(image_path: Path) -> tuple:
            stem = image_path.stem
            if stem == base_name:
                return (0, 0, stem)
            match = re.match(rf"^{re.escape(base_name)}_(\d+)$", stem)
            if match:
                return (0, int(match.group(1)), stem)
            match = re.search(r"(\d+)$", stem)
            if match:
                return (1, int(match.group(1)), stem)
            return (2, 0, stem)

        images_sorted = sorted(images, key=sort_key)
        return [image.name for image in images_sorted]

    def _build_html(self, filename: str, image_names: List[str], cache_key: str) -> str:
        """Generate HTML that renders slide images."""
        placeholder_src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
        html_parts = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            '<meta charset="utf-8">',
            f"<title>{self._escape_html(filename)}</title>",
            "<style>",
            "body { margin: 0; padding: 0; font-family: \"Segoe UI\", Arial, sans-serif; background: #0f172a; color: #0f172a; }",
            ".deck { max-width: none; margin: 0; }",
            ".slide { background: #0f172a; padding: 0; border-radius: 0; box-shadow: none; margin: 0; }",
            ".slide img { width: 100%; height: auto; display: block; background: #e2e8f0; }",
            "</style>",
            "</head>",
            "<body>",
            '<div class="deck">',
        ]

        for index, image_name in enumerate(image_names, start=1):
            image_url = f"/api/thumbnails/presentation-image/{cache_key}/{image_name}"
            html_parts.extend([
                '<section class="slide">',
                f'<img src="{placeholder_src}" data-src="{image_url}" alt="Slide {index}" loading="lazy" decoding="async">',
                "</section>",
            ])

        html_parts.extend([
            "</div>",
            "<script>",
            "(function() {",
            "  function eagerLoad() {",
            "    var imgs = document.querySelectorAll('img[data-src]');",
            "    for (var i = 0; i < imgs.length; i++) {",
            "      var img = imgs[i];",
            "      img.src = img.getAttribute('data-src');",
            "      img.removeAttribute('data-src');",
            "    }",
            "  }",
            "  if (!('IntersectionObserver' in window)) {",
            "    eagerLoad();",
            "    return;",
            "  }",
            "  var observer = new IntersectionObserver(function(entries) {",
            "    entries.forEach(function(entry) {",
            "      if (!entry.isIntersecting) {",
            "        return;",
            "      }",
            "      var img = entry.target;",
            "      img.src = img.getAttribute('data-src');",
            "      img.removeAttribute('data-src');",
            "      observer.unobserve(img);",
            "    });",
            "  }, { rootMargin: '200px 0px' });",
            "  var targets = document.querySelectorAll('img[data-src]');",
            "  for (var j = 0; j < targets.length; j++) {",
            "    observer.observe(targets[j]);",
            "  }",
            "})();",
            "</script>",
            "</body>",
            "</html>",
        ])

        return "\n".join(html_parts)

    def _clear_directory(self, directory: Path) -> None:
        """Remove all files from a directory."""
        for entry in directory.iterdir():
            if entry.is_file():
                entry.unlink()
            elif entry.is_dir():
                shutil.rmtree(entry)

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return (str(text)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#39;"))

    def is_presentation(self, file_path: str) -> bool:
        """
        Check if a file is a supported presentation format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a supported presentation
        """
        path = Path(file_path)
        return path.suffix.lower() in self.SUPPORTED_PRESENTATION_FORMATS

    def get_cached_preview(self, file_path: str) -> Optional[str]:
        """
        Get cached preview path if it exists.

        Args:
            file_path: Path to the original file

        Returns:
            Optional[str]: Path to cached preview, or None if not cached
        """
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / cache_key / "index.html"
        if html_path.exists():
            return str(html_path)
        return None

    def clear_cache(self, file_path: Optional[str] = None) -> int:
        """
        Clear presentation preview cache.

        Args:
            file_path: Specific file to clear cache for (None clears all)

        Returns:
            int: Number of cache directories deleted
        """
        if file_path:
            cache_key = self._generate_cache_key(file_path)
            preview_dir = self.cache_dir / cache_key
            if preview_dir.exists():
                shutil.rmtree(preview_dir)
                logger.info(f"Cleared presentation preview cache for {file_path}")
                return 1
            return 0

        count = 0
        for entry in self.cache_dir.iterdir():
            if entry.is_dir():
                shutil.rmtree(entry)
                count += 1

        logger.info(f"Cleared all presentation preview cache ({count} directories)")
        return count

    def _generate_cache_key(self, file_path: str) -> str:
        """
        Generate a unique cache key for a presentation preview.

        Args:
            file_path: Source file path

        Returns:
            str: Cache key (hash)
        """
        path = Path(file_path)
        mtime = path.stat().st_mtime if path.exists() else 0
        key_string = f"{file_path}_{mtime}_{self.CACHE_VERSION}"
        return hashlib.md5(key_string.encode()).hexdigest()


# Singleton instance
presentation_preview_service = PresentationPreviewService()
