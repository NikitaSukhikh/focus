"""
Ebook Preview Service

Handles conversion of ebook files to HTML for preview display.
Supports: .epub, .mobi, .azw, .azw3, .fb2
"""

from pathlib import Path
import hashlib
import html

from app.core.config import get_settings
from app.core.logging import get_logger

# Optional imports - gracefully handle missing dependencies
try:
    import ebooklib
    from ebooklib import epub
    EPUB_AVAILABLE = True
except ImportError:
    EPUB_AVAILABLE = False
    ebooklib = None
    epub = None

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    BeautifulSoup = None


logger = get_logger(__name__)
settings = get_settings()


class EbookPreviewService:
    """
    Service for converting ebooks to HTML for preview.
    """

    # Supported ebook formats
    SUPPORTED_EBOOK_FORMATS = {
        '.epub',  # Native support via ebooklib
        '.mobi',  # Limited support
        '.azw',   # Limited support
        '.azw3',  # Limited support
        '.fb2',   # FictionBook 2.0
        '.pdb',   # Palm Database
        '.djvu',  # DjVu scanned documents
    }

    def __init__(self):
        """Initialize the ebook preview service."""
        self.settings = settings
        self.cache_dir = Path(settings.storage.cache_dir) / "ebook_previews"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir = self.cache_dir / "images"
        self.images_dir.mkdir(parents=True, exist_ok=True)

    def convert_ebook_to_html(
        self,
        file_path: str,
        force_regenerate: bool = False
    ) -> str:
        """
        Convert an ebook file to HTML for preview.

        Args:
            file_path: Path to the ebook file
            force_regenerate: Force regeneration even if cached

        Returns:
            str: Path to the generated HTML file

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a supported ebook format or dependencies not installed
        """
        if not EPUB_AVAILABLE:
            raise ValueError(
                "Ebook preview feature is not available. "
                "Please install ebooklib: pip install ebooklib"
            )

        if not BS4_AVAILABLE:
            raise ValueError(
                "Ebook preview requires BeautifulSoup. "
                "Please install beautifulsoup4: pip install beautifulsoup4"
            )

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Check if ebook format is supported
        if path.suffix.lower() not in self.SUPPORTED_EBOOK_FORMATS:
            raise ValueError(
                f"Unsupported ebook format: {path.suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_EBOOK_FORMATS)}"
            )

        # Generate cache key
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / f"{cache_key}.html"

        # Return cached HTML if exists and not forcing regeneration
        if html_path.exists() and not force_regenerate:
            logger.debug(
                f"Using cached ebook preview: {html_path}",
                extra={"source": file_path, "cached": True}
            )
            return str(html_path)

        # Convert ebook to HTML
        try:
            if path.suffix.lower() == '.epub':
                html_content = self._epub_to_html(path)
            elif path.suffix.lower() == '.fb2':
                html_content = self._fb2_to_html(path)
            else:
                # For .mobi, .azw, .azw3 - attempt basic extraction
                html_content = self._generic_ebook_to_html(path)

            # Save HTML file
            html_path.write_text(html_content, encoding='utf-8')

            logger.info(
                f"Generated ebook preview: {html_path}",
                extra={"source": file_path}
            )

            return str(html_path)

        except Exception as e:
            logger.error(
                f"Failed to convert ebook to HTML: {file_path}: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to convert ebook: {e}")

    def _epub_to_html(self, path: Path) -> str:
        """
        Convert an EPUB file to HTML.

        Args:
            path: Path to the EPUB file

        Returns:
            str: HTML content
        """
        try:
            book = epub.read_epub(str(path))
        except Exception as e:
            raise ValueError(f"Failed to read EPUB file: {e}")

        # Extract metadata
        title = book.get_metadata('DC', 'title')
        title = title[0][0] if title else path.stem

        author = book.get_metadata('DC', 'creator')
        author = author[0][0] if author else 'Unknown Author'

        # Generate cache key for this specific book
        cache_key = self._generate_cache_key(str(path))

        # Extract images from EPUB
        image_mapping = {}
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                try:
                    # Get the image filename
                    img_name = item.get_name().split('/')[-1]
                    # Create a unique name using cache key
                    unique_img_name = f"{cache_key}_{img_name}"
                    img_path = self.images_dir / unique_img_name

                    # Save image
                    img_path.write_bytes(item.get_content())

                    # Map original name to accessible URL
                    # Store both the full path and just the filename
                    image_mapping[item.get_name()] = f"/api/thumbnails/ebook-image/{unique_img_name}"
                    image_mapping[img_name] = f"/api/thumbnails/ebook-image/{unique_img_name}"
                except Exception as e:
                    logger.warning(f"Failed to extract image {item.get_name()}: {e}")

        # Start HTML document
        html_parts = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            '<base href="/">',
            f'<title>{html.escape(str(title))}</title>',
            '<style>',
            self._get_reader_css(),
            '</style>',
            '<script>',
            self._get_navigation_script(),
            '</script>',
            '</head>',
            '<body>',
            '<div class="ebook-container">',
            '<div class="ebook-header">',
            f'<h1 class="ebook-title">{html.escape(str(title))}</h1>',
            f'<p class="ebook-author">by {html.escape(str(author))}</p>',
            '</div>',
            '<div class="ebook-content">',
        ]

        # Extract and process document items
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode('utf-8')
                    # Clean and extract body content
                    soup = BeautifulSoup(content, 'html.parser')

                    # Remove script and style tags
                    for tag in soup(['script', 'style']):
                        tag.decompose()

                    # Process images
                    for img in soup.find_all('img', src=True):
                        src = img['src']
                        # Try to find the image in our mapping
                        img_name = src.split('/')[-1]
                        if src in image_mapping:
                            img['src'] = image_mapping[src]
                        elif img_name in image_mapping:
                            img['src'] = image_mapping[img_name]

                    # Process links to work with concatenated content
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        # Handle internal links (starting with #)
                        if href.startswith('#'):
                            continue
                        # Handle external links
                        elif href.startswith(('http://', 'https://', 'mailto:')):
                            continue
                        # Handle links to other EPUB files
                        else:
                            # Convert file.html#section to #section
                            if '#' in href:
                                anchor = href.split('#')[1]
                                link['href'] = '#' + anchor
                            # For links without anchors, make them non-functional
                            else:
                                link.name = 'span'  # Convert <a> to <span>
                                if 'href' in link.attrs:
                                    del link.attrs['href']
                                link['style'] = link.get('style', '') + ' color: #0d9488; cursor: default;'

                    # Get body content or entire content if no body tag
                    body = soup.find('body')
                    if body:
                        html_parts.append(str(body))
                    else:
                        # If no body, just use the content
                        html_parts.append(str(soup))

                except Exception as e:
                    logger.warning(f"Failed to process EPUB item: {e}")
                    continue

        html_parts.extend([
            '</div>',  # ebook-content
            '</div>',  # ebook-container
            '</body>',
            '</html>'
        ])

        html_content = '\n'.join(html_parts)

        # Post-process to fix any remaining relative image references
        html_content = self._fix_image_references(html_content, cache_key, image_mapping)

        return html_content

    def _fb2_to_html(self, path: Path) -> str:
        """
        Convert an FB2 (FictionBook) file to HTML.

        Args:
            path: Path to the FB2 file

        Returns:
            str: HTML content
        """
        try:
            content = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            content = path.read_text(encoding='windows-1251')

        soup = BeautifulSoup(content, 'xml')

        # Extract metadata
        title_info = soup.find('title-info')
        title = 'Unknown Title'
        author = 'Unknown Author'

        if title_info:
            book_title = title_info.find('book-title')
            if book_title:
                title = book_title.get_text()

            author_tag = title_info.find('author')
            if author_tag:
                first_name = author_tag.find('first-name')
                last_name = author_tag.find('last-name')
                author_parts = []
                if first_name:
                    author_parts.append(first_name.get_text())
                if last_name:
                    author_parts.append(last_name.get_text())
                if author_parts:
                    author = ' '.join(author_parts)

        # Build HTML
        html_parts = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            f'<title>{html.escape(title)}</title>',
            '<style>',
            self._get_reader_css(),
            '</style>',
            '</head>',
            '<body>',
            '<div class="ebook-container">',
            '<div class="ebook-header">',
            f'<h1 class="ebook-title">{html.escape(title)}</h1>',
            f'<p class="ebook-author">by {html.escape(author)}</p>',
            '</div>',
            '<div class="ebook-content">',
        ]

        # Extract body content
        body = soup.find('body')
        if body:
            # Convert FB2 sections to HTML
            for section in body.find_all('section', recursive=False):
                html_parts.append(self._fb2_section_to_html(section))

        html_parts.extend([
            '</div>',
            '</div>',
            '</body>',
            '</html>'
        ])

        return '\n'.join(html_parts)

    def _fb2_section_to_html(self, section) -> str:
        """Convert FB2 section to HTML."""
        parts = []

        # Handle title
        title = section.find('title')
        if title:
            for p in title.find_all('p'):
                parts.append(f'<h2>{html.escape(p.get_text())}</h2>')

        # Handle paragraphs
        for p in section.find_all('p', recursive=False):
            parts.append(f'<p>{html.escape(p.get_text())}</p>')

        # Handle nested sections
        for subsection in section.find_all('section', recursive=False):
            parts.append(self._fb2_section_to_html(subsection))

        return '\n'.join(parts)

    def _generic_ebook_to_html(self, path: Path) -> str:
        """
        Fallback method for unsupported formats.

        Args:
            path: Path to the ebook file

        Returns:
            str: Basic HTML with file info
        """
        html_content = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{html.escape(path.name)}</title>
    <style>
        {self._get_reader_css()}
        .unsupported {{
            text-align: center;
            padding: 40px;
            color: #64748b;
        }}
    </style>
</head>
<body>
    <div class="ebook-container">
        <div class="unsupported">
            <h2>{html.escape(path.name)}</h2>
            <p>Preview not available for {html.escape(path.suffix)} format.</p>
            <p>File size: {path.stat().st_size / 1024 / 1024:.2f} MB</p>
        </div>
    </div>
</body>
</html>
'''
        return html_content

    def _get_navigation_script(self) -> str:
        """Get JavaScript for handling internal navigation."""
        return '''
document.addEventListener('DOMContentLoaded', function() {
    // Handle all anchor clicks
    document.addEventListener('click', function(e) {
        // Check if clicked element is a link or inside a link
        let target = e.target;
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }

        if (target && target.tagName === 'A') {
            const href = target.getAttribute('href');

            // Only handle internal anchor links
            if (href && href.startsWith('#')) {
                e.preventDefault();
                e.stopPropagation();

                // Get the target element
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    // Smooth scroll to the element
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
            // Prevent navigation for all other links (including javascript:void(0))
            else if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true); // Use capture phase to catch events early
});
'''

    def _get_reader_css(self) -> str:
        """Get CSS styles for the ebook reader."""
        return '''
html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    padding: 0;
    font-family: 'Georgia', 'Cambria', 'Times New Roman', serif;
    background: #f5f5f0;
    color: #2d2d2d;
    line-height: 1.8;
    user-select: text;
    -webkit-user-select: text;
}

.ebook-container {
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    min-height: 100vh;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.ebook-header {
    background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
    color: white;
    padding: 40px 40px 30px;
    text-align: center;
}

.ebook-title {
    font-size: 2.5em;
    margin: 0 0 10px 0;
    font-weight: 600;
    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.ebook-author {
    font-size: 1.2em;
    margin: 0;
    opacity: 0.95;
    font-style: italic;
}

.ebook-content {
    padding: 40px 60px 60px;
    font-size: 1.1em;
}

.ebook-content h1,
.ebook-content h2,
.ebook-content h3 {
    color: #0d9488;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
}

.ebook-content h1 {
    font-size: 2em;
    border-bottom: 2px solid #14b8a6;
    padding-bottom: 0.3em;
}

.ebook-content h2 {
    font-size: 1.6em;
}

.ebook-content h3 {
    font-size: 1.3em;
}

.ebook-content p {
    margin: 1em 0;
    text-align: justify;
    hyphens: auto;
    -webkit-hyphens: auto;
    user-select: text;
    cursor: text;
}

.ebook-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 20px auto;
}

.ebook-content em,
.ebook-content i {
    font-style: italic;
}

.ebook-content strong,
.ebook-content b {
    font-weight: 600;
    color: #1e293b;
}

.ebook-content blockquote {
    margin: 1.5em 20px;
    padding: 15px 20px;
    background: #f8fafc;
    border-left: 4px solid #14b8a6;
    font-style: italic;
    color: #475569;
}

.ebook-content ul,
.ebook-content ol {
    margin: 1em 0;
    padding-left: 2em;
}

.ebook-content li {
    margin: 0.5em 0;
}

.ebook-content a {
    color: #0d9488;
    text-decoration: none;
    border-bottom: 1px solid #14b8a6;
    transition: all 0.2s ease;
}

.ebook-content a:hover {
    color: #14b8a6;
    border-bottom-color: #0d9488;
    background: rgba(20, 184, 166, 0.05);
}

@media (max-width: 768px) {
    .ebook-content {
        padding: 30px 20px 40px;
        font-size: 1em;
    }

    .ebook-header {
        padding: 30px 20px 20px;
    }

    .ebook-title {
        font-size: 2em;
    }
}
'''

    def is_ebook(self, file_path: str) -> bool:
        """
        Check if a file is a supported ebook format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a supported ebook
        """
        path = Path(file_path)
        return path.suffix.lower() in self.SUPPORTED_EBOOK_FORMATS

    def get_cached_preview(self, file_path: str) -> str | None:
        """
        Get cached preview path if it exists.

        Args:
            file_path: Path to the original file

        Returns:
            str | None: Path to cached preview, or None if not cached
        """
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / f"{cache_key}.html"

        if html_path.exists():
            return str(html_path)
        return None

    def clear_cache(self, file_path: str | None = None) -> int:
        """
        Clear ebook preview cache.

        Args:
            file_path: Specific file to clear cache for (None clears all)

        Returns:
            int: Number of cache files deleted
        """
        if file_path:
            # Clear specific file's preview
            cache_key = self._generate_cache_key(file_path)
            html_path = self.cache_dir / f"{cache_key}.html"

            if html_path.exists():
                html_path.unlink()
                logger.info(f"Cleared ebook preview cache for {file_path}")
                return 1
            return 0
        else:
            # Clear all previews
            count = 0
            for html_file in self.cache_dir.glob("*.html"):
                html_file.unlink()
                count += 1

            logger.info(f"Cleared all ebook preview cache ({count} files)")
            return count

    def get_metadata(self, file_path: str) -> dict:
        """
        Extract metadata from an ebook file.

        Args:
            file_path: Path to the ebook file

        Returns:
            dict: Ebook metadata (title, author, etc.)
        """
        path = Path(file_path)

        if not path.exists():
            return {'title': path.stem, 'author': None}

        try:
            if path.suffix.lower() == '.epub':
                return self._get_epub_metadata(path)
            elif path.suffix.lower() == '.fb2':
                return self._get_fb2_metadata(path)
            else:
                return {'title': path.stem, 'author': None}
        except Exception as e:
            logger.error(f"Failed to extract ebook metadata: {e}")
            return {'title': path.stem, 'author': None}

    def _get_epub_metadata(self, path: Path) -> dict:
        """Extract metadata from EPUB file."""
        try:
            book = epub.read_epub(str(path))

            title = book.get_metadata('DC', 'title')
            title = title[0][0] if title else path.stem

            author = book.get_metadata('DC', 'creator')
            author = author[0][0] if author else None

            return {
                'title': str(title),
                'author': str(author) if author else None
            }
        except Exception as e:
            logger.warning(f"Failed to extract EPUB metadata: {e}")
            return {'title': path.stem, 'author': None}

    def _get_fb2_metadata(self, path: Path) -> dict:
        """Extract metadata from FB2 file."""
        try:
            try:
                content = path.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                content = path.read_text(encoding='windows-1251')

            soup = BeautifulSoup(content, 'xml')

            title_info = soup.find('title-info')
            title = path.stem
            author = None

            if title_info:
                book_title = title_info.find('book-title')
                if book_title:
                    title = book_title.get_text()

                author_tag = title_info.find('author')
                if author_tag:
                    first_name = author_tag.find('first-name')
                    last_name = author_tag.find('last-name')
                    author_parts = []
                    if first_name:
                        author_parts.append(first_name.get_text())
                    if last_name:
                        author_parts.append(last_name.get_text())
                    if author_parts:
                        author = ' '.join(author_parts)

            return {
                'title': title,
                'author': author
            }
        except Exception as e:
            logger.warning(f"Failed to extract FB2 metadata: {e}")
            return {'title': path.stem, 'author': None}

    def _fix_image_references(self, html_content: str, cache_key: str, image_mapping: dict) -> str:
        """
        Fix relative image references in HTML content to use proper API URLs.

        This handles cases where ebook converters generate HTML with relative image paths
        like 'cover.jpg' or '<id>_cover.jpg' that need to be converted to proper API URLs.

        Args:
            html_content: The HTML content to process
            cache_key: The cache key for this ebook
            image_mapping: Dictionary mapping image names to API URLs

        Returns:
            str: HTML content with fixed image references
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # Fix img tags with src attributes
            for img in soup.find_all('img', src=True):
                src = img['src']
                # Skip if already an absolute URL or API path
                if src.startswith(('http://', 'https://', '/api/')):
                    continue

                # Try to map using just the filename
                img_name = src.split('/')[-1]
                if img_name in image_mapping:
                    img['src'] = image_mapping[img_name]
                elif src in image_mapping:
                    img['src'] = image_mapping[src]
                else:
                    # Try to construct the path with cache_key prefix
                    potential_path = f"/api/thumbnails/ebook-image/{cache_key}_{img_name}"
                    # Check if the file exists in the images directory
                    img_file = self.images_dir / f"{cache_key}_{img_name}"
                    if img_file.exists():
                        img['src'] = potential_path

            # Fix SVG image tags with xlink:href attributes
            for image in soup.find_all('image'):
                href = image.get('xlink:href') or image.get('{http://www.w3.org/1999/xlink}href')
                if not href:
                    continue

                # Skip if already an absolute URL or API path
                if href.startswith(('http://', 'https://', '/api/')):
                    continue

                # Try to map using just the filename
                img_name = href.split('/')[-1]
                if img_name in image_mapping:
                    new_href = image_mapping[img_name]
                elif href in image_mapping:
                    new_href = image_mapping[href]
                else:
                    # Try to construct the path with cache_key prefix
                    potential_path = f"/api/thumbnails/ebook-image/{cache_key}_{img_name}"
                    # Check if the file exists in the images directory
                    img_file = self.images_dir / f"{cache_key}_{img_name}"
                    if img_file.exists():
                        new_href = potential_path
                    else:
                        continue

                # Update both possible attribute names
                if 'xlink:href' in image.attrs:
                    image['xlink:href'] = new_href
                if '{http://www.w3.org/1999/xlink}href' in image.attrs:
                    image['{http://www.w3.org/1999/xlink}href'] = new_href

            return str(soup)
        except Exception as e:
            logger.warning(f"Failed to fix image references in HTML: {e}")
            # Return original content if post-processing fails
            return html_content

    def _generate_cache_key(self, file_path: str) -> str:
        """
        Generate a unique cache key for an ebook preview.

        Args:
            file_path: Source file path

        Returns:
            str: Cache key (hash)
        """
        # Include file path and modification time in key
        path = Path(file_path)
        mtime = path.stat().st_mtime if path.exists() else 0

        key_string = f"{file_path}_{mtime}"
        return hashlib.md5(key_string.encode()).hexdigest()


# Singleton instance
ebook_preview_service = EbookPreviewService()
