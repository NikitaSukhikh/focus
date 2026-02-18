# Focus App Overview

## Product Summary
Focus is a desktop workspace app for collecting and organizing files, web links, text notes, and visual relationships (arrows) inside customizable Spaces.

Core UX is a three-pane layout:
- Main center pane: active Space canvas with tiles, notes, and arrows.
- Left sidebar: Spaces list and space management.
- Right side: object preview/inspector (plus assistant conversation area: will be soon implemented).

## What Users Can Do

### 1. Organize Work in Spaces
- Create, rename, select, and delete Spaces.
- Persist Space data in SQLite.
- Manage spaces from both sidebar and center pane (context menus and inline editing).

### 2. Build a Visual Canvas
- Add objects (files, links, web articles, plain text notes).
- Drag/reposition tiles on the canvas.
- Double-click empty canvas to add quick text notes.
- Draw arrows by dragging to show relationships between items.

### 3. Preview and Open Content
- Single click: focus item and inspect metadata/preview.
- Double click: open in native app when applicable.
- Dedicated preview behaviors for documents, media, and text/code.

### 4. Work With Many File Types
- `FILES_SUPPORTED.md` lists about 322 extensions.
- Major categories: documents, ebooks, images, audio, video, and large text/code coverage.
- Includes Word/Excel/PDF/HTML, common media formats, and broad developer/config file support.

### 5. Read Ebooks In-App
- Full preview support: EPUB, FB2.
- Limited support: MOBI/AZW/AZW3, CBZ/CBR, PDB, DJVU.
- Ebook metadata extraction (title/author), TOC navigation, embedded images, reader-style layout.


### 6. (Near Future) Use AI Assistant Capabilities


## Current Gaps and In-Progress Areas (Documented)
- Web-only and macOS support docs are scaffold-level plans, not fully completed implementations.

