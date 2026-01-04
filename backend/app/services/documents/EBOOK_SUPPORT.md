# Ebook Support Documentation

## Overview

Focus includes comprehensive ebook reading functionality, allowing users to preview and read ebooks directly within the application. The ebook preview system extracts metadata, renders content as HTML with proper styling, and provides an interactive reading experience.

## Supported Formats

### Full Support
- **EPUB** (`.epub`) - Industry standard ebook format
  - Metadata extraction (title, author)
  - Table of contents navigation
  - Embedded images
  - Internal links and cross-references

- **FictionBook 2.0** (`.fb2`) - XML-based ebook format
  - Metadata extraction (title, author)
  - Structured content rendering
  - Support for nested sections

### Limited Support
- **Mobipocket** (`.mobi`, `.azw`, `.azw3`) - Amazon Kindle formats
  - Basic file information display
  - Preview not available message

- **Comic Books** (`.cbz`, `.cbr`) - Archive-based comic formats
  - Recognized but limited preview support

- **Palm Database** (`.pdb`) - Legacy Palm OS format
  - Recognized but limited preview support

- **DjVu** (`.djvu`) - Scanned document format
  - Recognized but limited preview support

## Features

### Metadata Extraction
- **Title**: Extracted from ebook metadata or falls back to filename
- **Author**: Extracted from ebook metadata when available
- **Display**: Shows in preview header and on tile instead of filename

### Reading Experience
- **Reader-style Layout**: Clean, distraction-free reading interface
- **Smooth Scrolling**: CSS-based smooth scroll behavior
- **Typography**: Georgia serif font optimized for reading
- **Responsive Design**: Adapts to different screen sizes

### Navigation
- **Table of Contents**: Interactive chapter links
- **Internal Links**: Cross-references within the ebook
- **Smooth Navigation**: JavaScript-based smooth scrolling to sections

### Visual Elements
- **Images**: Extracted and served from EPUB files
  - Cover images
  - Illustrations
  - Diagrams
- **Styling**: Reader-friendly CSS with teal accent color
- **Link Highlighting**: Visible, interactive links with hover effects

## Technical Implementation

### Backend Components

#### Ebook Preview Service
**Location**: `backend/app/services/documents/ebook_preview.py`

**Key Methods**:
- `convert_ebook_to_html()`: Main conversion method
- `get_metadata()`: Extract title and author
- `is_ebook()`: Check if file is a supported ebook format
- `_epub_to_html()`: EPUB-specific conversion
- `_fb2_to_html()`: FictionBook-specific conversion

**Features**:
- MD5-based caching for performance
- Image extraction and serving
- Link processing for internal navigation
- CSS styling for reader experience

#### API Endpoints
**Location**: `backend/app/api/routes/thumbnails.py`

**Endpoints**:
1. `/api/thumbnails/document-preview` (GET)
   - Serves HTML preview of ebooks
   - Query parameter: `file_path`

2. `/api/thumbnails/ebook-metadata` (GET)
   - Returns title and author
   - Query parameter: `file_path`

3. `/api/thumbnails/ebook-image/{image_name}` (GET)
   - Serves extracted images from ebooks
   - Path parameter: `image_name`

### Frontend Components

#### File Type Detection
**Location**: `ui/src/utils/fileTypes.ts`

- `EBOOK_EXTENSIONS`: Set of supported ebook extensions
- `detectFileType()`: Categorizes files as 'ebook'
- `getEbookMimeType()`: Maps extensions to MIME types

#### Icon System
**Location**: `ui/src/components/icons/FileTypeIcons.tsx`

- `EbookIcon`: Teal book icon component
- Extension badge overlay (e.g., "EPUB")

#### Preview Components
**Location**: `ui/src/components/layout/previewpane/`

**Hooks**:
- `useFileTypeDetection`: Detects ebook files and generates preview URL
- `useEbookMetadata`: Fetches and caches ebook metadata

**Components**:
- `PreviewPane`: Main preview container
- `PreviewHeader`: Shows title and author
- `FullWindowPreview`: Expanded preview mode

#### Tile Components
**Location**: `ui/src/components/layout/centerpane/tile/`

**Hooks**:
- `useEbookMetadata`: Fetches metadata for tile display

**Components**:
- `Tile`: Main tile component
- `DefaultContent`: Renders book title and author on tile

## Dependencies

### Python Packages
```txt
ebooklib==0.20      # EPUB parsing and manipulation
lxml==6.0.2         # XML/HTML processing
beautifulsoup4      # HTML/XML parsing (already in requirements)
```

### JavaScript/TypeScript
- `lucide-react`: BookOpen icon
- React hooks for state management

## Caching Strategy

### Preview Cache
- **Location**: `storage/cache/ebook_previews/`
- **Key**: MD5 hash of `{file_path}_{modification_time}`
- **Format**: HTML files
- **Invalidation**: Automatic when source file changes

### Image Cache
- **Location**: `storage/cache/ebook_previews/images/`
- **Naming**: `{cache_key}_{original_filename}`
- **Format**: Original image format (PNG, JPEG, etc.)

## Usage

### Adding an Ebook
1. Drag and drop an ebook file onto the canvas
2. File is detected as 'ebook' type
3. Icon shows with teal book icon and extension badge
4. Tile displays book title and author (if available)

### Previewing an Ebook
1. Click on an ebook tile
2. Preview pane shows:
   - Book title and author in header
   - Full HTML-rendered content
   - Interactive table of contents
   - Embedded images
3. Click chapter links to navigate
4. Expand to full window for larger view

### Navigation
- **Chapter Links**: Click to jump to sections
- **Smooth Scrolling**: Automatic smooth scroll to targets
- **Internal Anchors**: Work within concatenated content
- **External Links**: Preserved (if any in ebook)

## Styling

### Reader CSS
- **Font**: Georgia, Cambria, Times New Roman (serif stack)
- **Colors**:
  - Background: #f5f5f0 (warm off-white)
  - Text: #2d2d2d (dark gray)
  - Accent: #14b8a6 (teal)
- **Layout**:
  - Max width: 800px
  - Center aligned
  - Generous padding (60px sides)
  - Line height: 1.8 for readability

### Header Styling
- **Gradient**: Teal gradient background
- **Typography**: Large title, italic author
- **Shadow**: Text shadow for depth

### Link Styling
- **Color**: Teal (#0d9488)
- **Underline**: Subtle border-bottom
- **Hover**: Color shift and background highlight
- **Transition**: Smooth 0.2s ease

## Performance Considerations

### Optimization
1. **Caching**: HTML previews cached after first conversion
2. **Lazy Loading**: Metadata fetched on demand
3. **Image Extraction**: One-time extraction, cached serving
4. **Link Processing**: Processed during conversion, not runtime

### Limitations
1. **Large Ebooks**: Very large books may take time to convert
2. **Complex EPUB**: Some advanced EPUB features may not render
3. **DRM**: DRM-protected ebooks are not supported

## Troubleshooting

### Common Issues

**Issue**: Ebook preview shows blank or error
- **Cause**: Corrupted EPUB or unsupported format
- **Solution**: Check backend logs, verify file integrity

**Issue**: Images not displaying
- **Cause**: Image extraction failed or path mismatch
- **Solution**: Check image cache directory, regenerate preview

**Issue**: Chapter links not working
- **Cause**: JavaScript not loaded or anchor IDs missing
- **Solution**: Clear cache and regenerate preview

**Issue**: Metadata not showing
- **Cause**: EPUB lacks DC metadata fields
- **Solution**: Expected behavior, falls back to filename

### Debug Mode
Check backend logs for:
- `[ebook_preview]` Conversion progress
- `[thumbnails]` API endpoint calls
- Image extraction warnings

## Future Enhancements

### Potential Improvements
1. **Reading Progress**: Save and restore reading position
2. **Bookmarks**: Add bookmark functionality
3. **Annotations**: Highlight and note-taking
4. **Search**: Full-text search within ebooks
5. **Font Controls**: User-adjustable font size and family
6. **Night Mode**: Dark theme for reading
7. **MOBI/AZW Support**: Better support for Kindle formats
8. **CBR/CBZ Rendering**: Comic book page-by-page viewer

## API Reference

### EbookPreviewService

```python
class EbookPreviewService:
    def convert_ebook_to_html(
        self,
        file_path: str,
        force_regenerate: bool = False
    ) -> str:
        """
        Convert an ebook to HTML for preview.

        Args:
            file_path: Path to the ebook file
            force_regenerate: Force regeneration even if cached

        Returns:
            str: Path to the generated HTML file
        """

    def get_metadata(self, file_path: str) -> dict:
        """
        Extract metadata from an ebook.

        Args:
            file_path: Path to the ebook file

        Returns:
            dict: {'title': str, 'author': str | None}
        """

    def is_ebook(self, file_path: str) -> bool:
        """
        Check if a file is a supported ebook format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if supported ebook
        """
```

### REST API

#### Get Ebook Preview
```http
GET /api/thumbnails/document-preview?file_path={path}
```

**Response**: HTML content (text/html)

#### Get Ebook Metadata
```http
GET /api/thumbnails/ebook-metadata?file_path={path}
```

**Response**:
```json
{
  "title": "Moby Dick",
  "author": "Herman Melville"
}
```

#### Get Ebook Image
```http
GET /api/thumbnails/ebook-image/{image_name}
```

**Response**: Image file (image/*)

## License

This ebook support implementation is part of Focus and follows the project's Apache-2.0 license.

## Contributing

When contributing to ebook support:
1. Test with various EPUB files (fiction, non-fiction, technical)
2. Verify metadata extraction works correctly
3. Check image rendering in different contexts
4. Ensure navigation works smoothly
5. Test caching behavior
6. Update this documentation for new features
